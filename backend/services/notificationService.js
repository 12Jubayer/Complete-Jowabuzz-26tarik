import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import { publishUserNotification } from './notificationEventBus.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAX_MESSAGE_LENGTH = 2000;

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function formatTag(audienceType) {
  return audienceType === 'all' ? 'Broadcast' : 'Targeted';
}

function mapAdminNotificationRow(row) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    audienceType: row.audience_type,
    targetRole: row.target_role,
    targetUserId: row.target_user_id,
    tag: formatTag(row.audience_type),
    recipientCount: Number(row.recipient_count || 0),
    createdAt: row.created_at,
  };
}

function mapUserNotificationRow(row) {
  return {
    id: row.id,
    notificationId: row.notification_id,
    title: row.title,
    message: row.message,
    isRead: Boolean(row.is_read),
    tag: formatTag(row.audience_type),
    createdAt: row.created_at,
  };
}

function validateMessage(message) {
  const text = String(message || '').trim();
  if (!text) {
    const error = new Error('Message is required');
    error.statusCode = 400;
    throw error;
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    const error = new Error(`Message must be ${MAX_MESSAGE_LENGTH} characters or less`);
    error.statusCode = 400;
    throw error;
  }
  return text;
}

function validateTitle(title) {
  const text = String(title || '').trim();
  if (!text) {
    const error = new Error('Title is required');
    error.statusCode = 400;
    throw error;
  }
  if (text.length > 200) {
    const error = new Error('Title is too long');
    error.statusCode = 400;
    throw error;
  }
  return text;
}

export async function migrateNotificationsSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'notifications.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  for (const statement of splitSqlStatements(schema)) {
    await pool.query(statement);
  }
}

export async function getNotificationAudienceCounts() {
  const pool = getPool();

  const [[users]] = await pool.query(
    `SELECT COUNT(*) AS total FROM users WHERE status = 'active' AND role = 'user'`,
  );
  const [[affiliates]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM affiliate_profiles ap
     INNER JOIN users u ON u.id = ap.user_id
     WHERE u.status = 'active' AND ap.status = 'approved'`,
  );
  const [[agents]] = await pool.query(
    `SELECT COUNT(*) AS total FROM agents WHERE status = 'active'`,
  );
  const [[admins]] = await pool.query(
    `SELECT COUNT(*) AS total FROM admins WHERE status = 'active'`,
  );

  return {
    allUsers: Number(users.total || 0),
    player: Number(users.total || 0),
    affiliate: Number(affiliates.total || 0),
    agent: Number(agents.total || 0),
    admin: Number(admins.total || 0),
  };
}

async function resolveRecipientUserIds(audienceType, targetRole = null) {
  const pool = getPool();

  if (audienceType === 'all' || (audienceType === 'role' && targetRole === 'player')) {
    const [rows] = await pool.query(
      `SELECT id FROM users WHERE status = 'active' AND role = 'user'`,
    );
    return rows.map((row) => row.id);
  }

  if (audienceType === 'role' && targetRole === 'affiliate') {
    const [rows] = await pool.query(
      `SELECT ap.user_id AS id
       FROM affiliate_profiles ap
       INNER JOIN users u ON u.id = ap.user_id
       WHERE u.status = 'active' AND ap.status = 'approved'`,
    );
    return rows.map((row) => row.id);
  }

  if (audienceType === 'role' && targetRole === 'admin') {
    const [rows] = await pool.query(
      `SELECT id FROM users WHERE status = 'active' AND role = 'admin'`,
    );
    return rows.map((row) => row.id);
  }

  if (audienceType === 'role' && targetRole === 'agent') {
    return [];
  }

  return [];
}

async function insertUserNotificationRows(connection, notificationId, recipientUserIds) {
  if (!recipientUserIds.length) return;

  const values = recipientUserIds.map((userId) => [notificationId, userId]);
  await connection.query(`INSERT INTO user_notifications (notification_id, user_id) VALUES ?`, [
    values,
  ]);
}

function emitNotifications(notificationId, recipientUserIds, payload) {
  recipientUserIds.forEach((userId) => {
    publishUserNotification(userId, {
      type: 'notification',
      notificationId,
      ...payload,
    });
  });
}

export async function createAdminNotification({ title, message, audienceMode, targetRole }) {
  const pool = getPool();
  const safeTitle = validateTitle(title);
  const safeMessage = validateMessage(message);

  const audienceType = audienceMode === 'role' ? 'role' : 'all';
  const role = audienceMode === 'role' ? String(targetRole || '').trim().toLowerCase() : null;

  if (audienceType === 'role' && !['player', 'agent', 'affiliate', 'admin'].includes(role)) {
    const error = new Error('Select a valid role');
    error.statusCode = 400;
    throw error;
  }

  const recipientUserIds = await resolveRecipientUserIds(audienceType, role);

  if (audienceType === 'role' && role !== 'agent' && recipientUserIds.length === 0) {
    const error = new Error('No active users found for the selected role');
    error.statusCode = 400;
    throw error;
  }

  if (audienceType === 'all' && recipientUserIds.length === 0) {
    const error = new Error('No active users found');
    error.statusCode = 400;
    throw error;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO notifications (title, message, audience_type, target_role, target_user_id)
       VALUES (?, ?, ?, ?, NULL)`,
      [safeTitle, safeMessage, audienceType, role],
    );

    const notificationId = result.insertId;
    await insertUserNotificationRows(connection, notificationId, recipientUserIds);

    await connection.commit();

    emitNotifications(notificationId, recipientUserIds, {
      title: safeTitle,
      message: safeMessage,
      tag: formatTag(audienceType),
      isRead: false,
    });

    return getAdminNotificationById(notificationId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function sendSystemNotification({
  userId,
  title,
  message,
  connection = null,
}) {
  if (!userId) return null;

  const safeTitle = validateTitle(title);
  const safeMessage = validateMessage(message);
  const pool = connection || getPool();
  const ownsConnection = !connection;
  const db = connection || (await pool.getConnection());

  try {
    if (ownsConnection) await db.beginTransaction();

    const [result] = await db.query(
      `INSERT INTO notifications (title, message, audience_type, target_role, target_user_id)
       VALUES (?, ?, 'user', NULL, ?)`,
      [safeTitle, safeMessage, userId],
    );

    const notificationId = result.insertId;
    await insertUserNotificationRows(db, notificationId, [userId]);

    if (ownsConnection) await db.commit();

    emitNotifications(notificationId, [userId], {
      title: safeTitle,
      message: safeMessage,
      tag: 'Targeted',
      isRead: false,
    });

    return notificationId;
  } catch (error) {
    if (ownsConnection) await db.rollback();
    throw error;
  } finally {
    if (ownsConnection) db.release();
  }
}

export async function notifyDepositApproved(userId, amount) {
  return sendSystemNotification({
    userId,
    title: 'Deposit approved',
    message: `Your deposit of ৳${Number(amount || 0).toFixed(2)} has been approved.`,
  });
}

export async function notifyWithdrawApproved(userId, amount) {
  return sendSystemNotification({
    userId,
    title: 'Withdraw approved',
    message: `Your withdrawal of ৳${Number(amount || 0).toFixed(2)} has been processed.`,
  });
}

export async function notifyAffiliatePayout(userId, amount) {
  return sendSystemNotification({
    userId,
    title: 'Affiliate commission released',
    message: `Affiliate commission of ৳${Number(amount || 0).toFixed(2)} has been released.`,
  });
}

export async function notifyBonusReleased(userId, amount, titleText = 'Bonus added successfully') {
  return sendSystemNotification({
    userId,
    title: titleText,
    message: `Bonus of ৳${Number(amount || 0).toFixed(2)} has been added to your account.`,
  });
}

export async function notifyWeeklyCashback(userId, amount, titleText = 'Weekly Cashback') {
  return sendSystemNotification({
    userId,
    title: titleText,
    message: `Weekly cashback of ৳${Number(amount || 0).toFixed(2)} has been credited to your balance.`,
  });
}

export async function listAdminNotifications({ page = 1, limit = 50 } = {}) {
  const pool = getPool();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const offset = (safePage - 1) * safeLimit;

  const [rows] = await pool.query(
    `SELECT n.id, n.title, n.message, n.audience_type, n.target_role, n.target_user_id, n.created_at,
            COUNT(un.id) AS recipient_count
     FROM notifications n
     LEFT JOIN user_notifications un ON un.notification_id = n.id
     GROUP BY n.id
     ORDER BY n.created_at DESC
     LIMIT ? OFFSET ?`,
    [safeLimit, offset],
  );

  return {
    data: rows.map(mapAdminNotificationRow),
    audienceCounts: await getNotificationAudienceCounts(),
  };
}

export async function getAdminNotificationById(id) {
  const pool = getPool();
  const [[row]] = await pool.query(
    `SELECT n.id, n.title, n.message, n.audience_type, n.target_role, n.target_user_id, n.created_at,
            COUNT(un.id) AS recipient_count
     FROM notifications n
     LEFT JOIN user_notifications un ON un.notification_id = n.id
     WHERE n.id = ?
     GROUP BY n.id
     LIMIT 1`,
    [id],
  );

  return row ? mapAdminNotificationRow(row) : null;
}

export async function listUserNotifications(userId, { page = 1, limit = 50 } = {}) {
  const pool = getPool();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const offset = (safePage - 1) * safeLimit;

  const [rows] = await pool.query(
    `SELECT un.id, un.notification_id, un.is_read, un.created_at,
            n.title, n.message, n.audience_type
     FROM user_notifications un
     INNER JOIN notifications n ON n.id = un.notification_id
     WHERE un.user_id = ?
     ORDER BY un.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, safeLimit, offset],
  );

  const [[{ unreadCount }]] = await pool.query(
    `SELECT COUNT(*) AS unreadCount
     FROM user_notifications
     WHERE user_id = ? AND is_read = 0`,
    [userId],
  );

  return {
    data: rows.map(mapUserNotificationRow),
    unreadCount: Number(unreadCount || 0),
  };
}

export async function markUserNotificationRead(userNotificationId, userId) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `UPDATE user_notifications
       SET is_read = 1
       WHERE id = ? AND user_id = ?`,
      [userNotificationId, userId],
    );

    if (!result.affectedRows) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return listUserNotifications(userId, { page: 1, limit: 1 });
}

export async function getUserUnreadNotificationCount(userId) {
  const pool = getPool();
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS unreadCount
     FROM user_notifications
     WHERE user_id = ? AND is_read = 0`,
    [userId],
  );
  return Number(row?.unreadCount || 0);
}

export default migrateNotificationsSchema;
