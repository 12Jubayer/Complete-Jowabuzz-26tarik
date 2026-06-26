import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAX_MESSAGE_LENGTH = 2000;

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function mapMessageRow(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderType: row.sender_type,
    senderId: row.sender_id,
    message: row.message,
    attachmentUrl: row.attachment_url,
    attachmentType: row.attachment_type,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
  };
}

function mapConversationRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    guestId: row.guest_id,
    status: row.status,
    lastMessage: row.last_message,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userName: row.user_name || null,
    userPhone: row.user_phone || null,
    unreadCount: Number(row.unread_count || 0),
  };
}

function displayName(row) {
  if (row.user_name) return row.user_name;
  if (row.user_phone) return row.user_phone;
  if (row.guest_id) return `Guest ${String(row.guest_id).slice(-6)}`;
  return 'Guest';
}

export async function migrateLiveChatSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'live_chat.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  for (const statement of splitSqlStatements(schema)) {
    await pool.query(statement);
  }

  const ensureColumn = async (table, column, definition) => {
    const [[exists]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = ?
         AND column_name = ?`,
      [table, column],
    );

    if (!Number(exists.total)) {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  };

  await ensureColumn('chat_conversations', 'guest_id', 'VARCHAR(64) NULL');
  await ensureColumn('chat_conversations', 'last_message', 'TEXT NULL');
  await ensureColumn('chat_conversations', 'last_message_at', 'TIMESTAMP NULL');
  await ensureColumn('chat_messages', 'attachment_url', 'VARCHAR(500) NULL');
  await ensureColumn('chat_messages', 'attachment_type', 'VARCHAR(50) NULL');
}

async function findConversationByIdentity({ userId = null, guestId = null }) {
  const pool = getPool();

  if (userId) {
    const [[row]] = await pool.query(`SELECT * FROM chat_conversations WHERE user_id = ? LIMIT 1`, [
      userId,
    ]);
    return row || null;
  }

  if (guestId) {
    const [[row]] = await pool.query(`SELECT * FROM chat_conversations WHERE guest_id = ? LIMIT 1`, [
      guestId,
    ]);
    return row || null;
  }

  return null;
}

export async function getOrCreateConversation({ userId = null, guestId = null }) {
  const pool = getPool();
  const existing = await findConversationByIdentity({ userId, guestId });
  if (existing) return existing;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO chat_conversations (user_id, guest_id, status)
       VALUES (?, ?, 'open')`,
      [userId || null, userId ? null : guestId || null],
    );

    await connection.commit();

    const [[row]] = await pool.query(`SELECT * FROM chat_conversations WHERE id = ? LIMIT 1`, [
      result.insertId,
    ]);
    return row;
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return findConversationByIdentity({ userId, guestId });
    }
    throw error;
  } finally {
    connection.release();
  }
}

function validateMessageText(message) {
  const text = String(message || '').trim();
  if (text.length > MAX_MESSAGE_LENGTH) {
    const error = new Error(`Message must be ${MAX_MESSAGE_LENGTH} characters or less`);
    error.statusCode = 400;
    throw error;
  }
  return text;
}

async function updateConversationPreview(connection, conversationId, preview) {
  await connection.query(
    `UPDATE chat_conversations
     SET last_message = ?, last_message_at = NOW(), updated_at = NOW()
     WHERE id = ?`,
    [preview, conversationId],
  );
}

function buildPreview(message, attachmentUrl, attachmentType) {
  if (message) return message.slice(0, 500);
  if (attachmentUrl) {
    if (attachmentType?.startsWith('image/')) return '[Image]';
    return '[Attachment]';
  }
  return '';
}

export async function sendUserChatMessage({
  userId = null,
  guestId = null,
  message = '',
  attachmentUrl = null,
  attachmentType = null,
}) {
  const safeMessage = validateMessageText(message);

  if (!safeMessage && !attachmentUrl) {
    const error = new Error('Message or attachment is required');
    error.statusCode = 400;
    throw error;
  }

  if (!userId && !guestId) {
    const error = new Error('Guest id is required');
    error.statusCode = 400;
    throw error;
  }

  const pool = getPool();
  const conversation = await getOrCreateConversation({ userId, guestId });
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO chat_messages
       (conversation_id, sender_type, sender_id, message, attachment_url, attachment_type, is_read)
       VALUES (?, 'user', ?, ?, ?, ?, 0)`,
      [conversation.id, userId || null, safeMessage || null, attachmentUrl, attachmentType],
    );

    await updateConversationPreview(
      connection,
      conversation.id,
      buildPreview(safeMessage, attachmentUrl, attachmentType),
    );

    await connection.commit();

    const [[row]] = await pool.query(`SELECT * FROM chat_messages WHERE id = ? LIMIT 1`, [
      result.insertId,
    ]);

    return {
      message: mapMessageRow(row),
      conversationId: conversation.id,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function sendAdminChatReply({
  conversationId,
  adminId,
  message = '',
  attachmentUrl = null,
  attachmentType = null,
}) {
  const safeMessage = validateMessageText(message);

  if (!safeMessage && !attachmentUrl) {
    const error = new Error('Message or attachment is required');
    error.statusCode = 400;
    throw error;
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[conversation]] = await connection.query(
      `SELECT id FROM chat_conversations WHERE id = ? LIMIT 1`,
      [conversationId],
    );

    if (!conversation) {
      const error = new Error('Conversation not found');
      error.statusCode = 404;
      throw error;
    }

    const [result] = await connection.query(
      `INSERT INTO chat_messages
       (conversation_id, sender_type, sender_id, message, attachment_url, attachment_type, is_read)
       VALUES (?, 'admin', ?, ?, ?, ?, 0)`,
      [conversationId, adminId, safeMessage || null, attachmentUrl, attachmentType],
    );

    await updateConversationPreview(
      connection,
      conversationId,
      buildPreview(safeMessage, attachmentUrl, attachmentType),
    );

    await connection.commit();

    const [[row]] = await pool.query(`SELECT * FROM chat_messages WHERE id = ? LIMIT 1`, [
      result.insertId,
    ]);

    return {
      message: mapMessageRow(row),
      conversationId,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listAdminConversations({ search = '' } = {}) {
  const pool = getPool();
  const term = String(search || '').trim();
  const params = [];
  let whereClause = `WHERE c.status = 'open'`;

  if (term) {
    whereClause += ` AND (u.name LIKE ? OR u.phone LIKE ? OR c.guest_id LIKE ?)`;
    const like = `%${term}%`;
    params.push(like, like, like);
  }

  const [rows] = await pool.query(
    `SELECT c.id, c.user_id, c.guest_id, c.status, c.last_message, c.last_message_at,
            c.created_at, c.updated_at,
            u.name AS user_name, u.phone AS user_phone,
            (
              SELECT COUNT(*)
              FROM chat_messages m
              WHERE m.conversation_id = c.id
                AND m.sender_type = 'user'
                AND m.is_read = 0
            ) AS unread_count
     FROM chat_conversations c
     LEFT JOIN users u ON u.id = c.user_id
     ${whereClause}
     ORDER BY COALESCE(c.last_message_at, c.created_at) DESC`,
    params,
  );

  return rows.map((row) => ({
    ...mapConversationRow(row),
    displayName: displayName(row),
  }));
}

export async function listConversationMessages(conversationId, { markUserMessagesRead = false } = {}) {
  const pool = getPool();

  const [[conversation]] = await pool.query(
    `SELECT c.*, u.name AS user_name, u.phone AS user_phone
     FROM chat_conversations c
     LEFT JOIN users u ON u.id = c.user_id
     WHERE c.id = ?
     LIMIT 1`,
    [conversationId],
  );

  if (!conversation) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  if (markUserMessagesRead) {
    await pool.query(
      `UPDATE chat_messages
       SET is_read = 1
       WHERE conversation_id = ? AND sender_type = 'user' AND is_read = 0`,
      [conversationId],
    );
  }

  const [rows] = await pool.query(
    `SELECT * FROM chat_messages
     WHERE conversation_id = ?
     ORDER BY created_at ASC`,
    [conversationId],
  );

  return {
    conversation: {
      ...mapConversationRow(conversation),
      displayName: displayName(conversation),
    },
    data: rows.map(mapMessageRow),
  };
}

export async function getUserChatMessages({ userId = null, guestId = null, markAdminMessagesRead = false }) {
  const conversation = await findConversationByIdentity({ userId, guestId });

  if (!conversation) {
    return { conversation: null, data: [], unreadCount: 0 };
  }

  if (markAdminMessagesRead) {
    const pool = getPool();
    await pool.query(
      `UPDATE chat_messages
       SET is_read = 1
       WHERE conversation_id = ? AND sender_type = 'admin' AND is_read = 0`,
      [conversation.id],
    );
  }

  const result = await listConversationMessages(conversation.id);
  const pool = getPool();
  const [[{ unreadCount }]] = await pool.query(
    `SELECT COUNT(*) AS unreadCount
     FROM chat_messages
     WHERE conversation_id = ? AND sender_type = 'admin' AND is_read = 0`,
    [conversation.id],
  );

  return {
    ...result,
    unreadCount: Number(unreadCount || 0),
  };
}

export async function markChatMessageRead(messageId, { userId = null, guestId = null, adminId = null }) {
  const pool = getPool();
  const [[message]] = await pool.query(
    `SELECT m.*, c.user_id, c.guest_id
     FROM chat_messages m
     INNER JOIN chat_conversations c ON c.id = m.conversation_id
     WHERE m.id = ?
     LIMIT 1`,
    [messageId],
  );

  if (!message) {
    const error = new Error('Message not found');
    error.statusCode = 404;
    throw error;
  }

  if (adminId) {
    if (message.sender_type !== 'user') {
      const error = new Error('Only user messages can be marked read by admin');
      error.statusCode = 403;
      throw error;
    }
  } else if (userId || guestId) {
    if (message.sender_type !== 'admin') {
      const error = new Error('Only admin messages can be marked read by user');
      error.statusCode = 403;
      throw error;
    }

    const ownsConversation =
      (userId && Number(message.user_id) === Number(userId)) ||
      (guestId && message.guest_id === guestId);

    if (!ownsConversation) {
      const error = new Error('Message not found');
      error.statusCode = 404;
      throw error;
    }
  } else {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }

  await pool.query(`UPDATE chat_messages SET is_read = 1 WHERE id = ?`, [messageId]);
  return { success: true };
}

export async function getConversationByIdentity({ userId = null, guestId = null }) {
  return findConversationByIdentity({ userId, guestId });
}

export default migrateLiveChatSchema;
