import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import { getSiteSetting, upsertSiteSetting } from './siteSettingsService.js';
import { getOrCreateConversation, sendUserChatMessage } from './liveChatService.js';

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

const MAX_MESSAGE_LENGTH = 2000;

function validateMessageText(message) {
  const text = String(message || '').trim();
  if (text.length > MAX_MESSAGE_LENGTH) {
    const error = new Error(`Message must be ${MAX_MESSAGE_LENGTH} characters or less`);
    error.statusCode = 400;
    throw error;
  }
  return text;
}

function buildPreview(message, attachmentUrl, attachmentType) {
  if (message) return message.slice(0, 500);
  if (attachmentUrl) {
    if (attachmentType?.startsWith('image/')) return '[Image]';
    return '[Attachment]';
  }
  return '';
}

async function updateConversationPreview(connection, conversationId, preview) {
  await connection.query(
    `UPDATE chat_conversations
     SET last_message = ?, last_message_at = NOW(), updated_at = NOW()
     WHERE id = ?`,
    [preview, conversationId],
  );
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CHAT_SETTINGS_KEY = 'live_chat_settings';

const DEFAULT_FALLBACK_MESSAGE =
  'দয়া করে অপেক্ষা করুন, আমাদের একজন প্রতিনিধি আপনার সাথে যোগাযোগ করবে।';

const DEFAULT_CHAT_SETTINGS = {
  enabled: true,
  fallbackMessage: DEFAULT_FALLBACK_MESSAGE,
};

const DEFAULT_FAQ_SEED = [
  {
    question: 'কিভাবে ডিপোজিট করবো?',
    answer:
      'Deposit বাটনে click করুন, payment method select করুন, amount লিখে transaction details submit করুন। আমাদের টিম verify করে balance add করবে।',
    sort_order: 1,
  },
  {
    question: 'কিভাবে উইথড্র করবো?',
    answer:
      'Profile বা Withdraw section থেকে withdraw request দিন। আপনার account details ঠিক থাকলে admin approval এর পর payment complete হবে।',
    sort_order: 2,
  },
  {
    question: 'আমার ডিপোজিট balance এ আসেনি কেন?',
    answer:
      'আপনার transaction verify হতে কিছু সময় লাগতে পারে। দয়া করে অপেক্ষা করুন অথবা transaction ID দিয়ে support এ message করুন।',
    sort_order: 3,
  },
  {
    question: 'আমার game balance 0.00 দেখাচ্ছে কেন?',
    answer:
      'Game provider wallet sync হতে সময় লাগতে পারে। দয়া করে game refresh করুন। সমস্যা থাকলে support team আপনার account check করবে।',
    sort_order: 4,
  },
  {
    question: 'Bonus কিভাবে পাবো?',
    answer:
      'Active promotion/bonus rules অনুযায়ী eligible হলে bonus পাওয়া যাবে। Bonus claim করার আগে promotion terms পড়ে নিন।',
    sort_order: 5,
  },
  {
    question: 'VIP Level কিভাবে বাড়বে?',
    answer:
      'আপনার turnover/EXP বাড়লে VIP level automatically upgrade হবে। VIP reward admin settings অনুযায়ী balance এ add হবে।',
    sort_order: 6,
  },
  {
    question: 'Password ভুলে গেলে কী করবো?',
    answer:
      'Login page এর Forgot Password option ব্যবহার করুন। সমস্যা হলে support team আপনার account verify করে সাহায্য করবে।',
    sort_order: 7,
  },
  {
    question: 'Account verify করতে হবে কি?',
    answer:
      'Security reason এর জন্য কিছু ক্ষেত্রে account verification/KYC প্রয়োজন হতে পারে। Admin চাইলে আপনাকে verification document দিতে বলতে পারে।',
    sort_order: 8,
  },
  {
    question: 'Agent কিভাবে হবো?',
    answer:
      'Agent হওয়ার জন্য support team অথবা admin এর সাথে যোগাযোগ করুন। Approval হলে আপনাকে agent panel access দেওয়া হবে।',
    sort_order: 9,
  },
  {
    question: 'Support কখন reply করবে?',
    answer:
      'আমাদের support team যত দ্রুত সম্ভব reply করবে। আপনার প্রশ্ন pending থাকলে দয়া করে অপেক্ষা করুন।',
    sort_order: 10,
  },
];

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function mapFaqRow(row) {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function normalizeChatSettings(payload = {}) {
  const fallback =
    String(payload.fallbackMessage ?? payload.fallback_message ?? DEFAULT_FALLBACK_MESSAGE).trim() ||
    DEFAULT_FALLBACK_MESSAGE;
  return {
    enabled: payload.enabled !== false && payload.enabled !== 0,
    fallbackMessage: fallback.slice(0, 2000),
  };
}

export async function getChatSettings() {
  const raw = await getSiteSetting(CHAT_SETTINGS_KEY);
  if (!raw) {
    const legacy = await getSiteSetting('general_chat');
    if (legacy) {
      return normalizeChatSettings({
        enabled: legacy.enabled,
        fallbackMessage: DEFAULT_FALLBACK_MESSAGE,
      });
    }
    return { ...DEFAULT_CHAT_SETTINGS };
  }
  return normalizeChatSettings(raw);
}

export async function saveChatSettings(payload = {}) {
  const current = await getChatSettings();
  const normalized = normalizeChatSettings({ ...current, ...payload });
  await upsertSiteSetting(CHAT_SETTINGS_KEY, normalized);
  await upsertSiteSetting('general_chat', { enabled: normalized.enabled });
  return normalized;
}

async function ensureColumn(table, column, definition) {
  const pool = getPool();
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
}

async function ensureSenderTypeBot() {
  const pool = getPool();
  const [[row]] = await pool.query(
    `SELECT COLUMN_TYPE AS columnType
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'chat_messages'
       AND column_name = 'sender_type'
     LIMIT 1`,
  );
  const columnType = String(row?.columnType || '');
  if (!columnType.includes('bot')) {
    await pool.query(
      `ALTER TABLE chat_messages
       MODIFY sender_type ENUM('user', 'admin', 'bot') NOT NULL`,
    );
  }
}

export async function migrateChatFaqSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'chat_faq.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  for (const statement of splitSqlStatements(schema)) {
    await pool.query(statement);
  }

  await ensureSenderTypeBot();
  await ensureColumn('chat_conversations', 'chat_status', "VARCHAR(32) NOT NULL DEFAULT 'open'");
  await ensureColumn('chat_conversations', 'is_unread_for_admin', 'TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumn('chat_conversations', 'last_user_question', 'TEXT NULL');
  await ensureColumn('chat_conversations', 'assigned_admin_id', 'BIGINT NULL');

  const settings = await getChatSettings();
  await upsertSiteSetting(CHAT_SETTINGS_KEY, settings);

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM chat_faqs`);
  if (Number(total) === 0) {
    for (const item of DEFAULT_FAQ_SEED) {
      await pool.query(
        `INSERT INTO chat_faqs (question, answer, is_active, sort_order)
         VALUES (?, ?, 1, ?)`,
        [item.question, item.answer, item.sort_order],
      );
    }
  }

  return true;
}

export async function listActiveFaqs() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT * FROM chat_faqs
     WHERE is_active = 1
     ORDER BY sort_order ASC, id ASC`,
  );
  return rows.map(mapFaqRow);
}

export async function listAllFaqs() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT * FROM chat_faqs ORDER BY sort_order ASC, id ASC`,
  );
  return rows.map(mapFaqRow);
}

export async function getFaqById(id) {
  const pool = getPool();
  const [[row]] = await pool.query(`SELECT * FROM chat_faqs WHERE id = ? LIMIT 1`, [id]);
  return row ? mapFaqRow(row) : null;
}

function validateFaqPayload(payload = {}, { partial = false } = {}) {
  const question = String(payload.question ?? '').trim();
  const answer = String(payload.answer ?? '').trim();
  const sortOrder = Number(payload.sortOrder ?? payload.sort_order ?? 0);
  const isActive = payload.isActive !== false && payload.is_active !== false && payload.is_active !== 0;

  if (!partial || payload.question !== undefined) {
    if (!question) {
      const error = new Error('FAQ question is required');
      error.statusCode = 400;
      throw error;
    }
  }
  if (!partial || payload.answer !== undefined) {
    if (!answer) {
      const error = new Error('FAQ answer is required');
      error.statusCode = 400;
      throw error;
    }
  }

  return {
    question,
    answer,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive: partial && payload.isActive === undefined && payload.is_active === undefined ? undefined : isActive,
  };
}

export async function createFaq(payload) {
  const data = validateFaqPayload(payload);
  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO chat_faqs (question, answer, is_active, sort_order)
     VALUES (?, ?, ?, ?)`,
    [data.question, data.answer, data.isActive ? 1 : 0, data.sortOrder],
  );
  return getFaqById(result.insertId);
}

export async function updateFaq(id, payload) {
  const existing = await getFaqById(id);
  if (!existing) {
    const error = new Error('FAQ not found');
    error.statusCode = 404;
    throw error;
  }
  const data = validateFaqPayload(payload, { partial: true });
  const pool = getPool();
  await pool.query(
    `UPDATE chat_faqs
     SET question = COALESCE(?, question),
         answer = COALESCE(?, answer),
         is_active = COALESCE(?, is_active),
         sort_order = COALESCE(?, sort_order),
         updated_at = NOW()
     WHERE id = ?`,
    [
      data.question || null,
      data.answer || null,
      data.isActive === undefined ? null : data.isActive ? 1 : 0,
      data.sortOrder === undefined ? null : data.sortOrder,
      id,
    ],
  );
  return getFaqById(id);
}

export async function deleteFaq(id) {
  const pool = getPool();
  const [result] = await pool.query(`DELETE FROM chat_faqs WHERE id = ?`, [id]);
  if (!result.affectedRows) {
    const error = new Error('FAQ not found');
    error.statusCode = 404;
    throw error;
  }
  return { success: true };
}

async function insertBotMessage(connection, conversationId, message) {
  const safeMessage = validateMessageText(message);
  const [result] = await connection.query(
    `INSERT INTO chat_messages
     (conversation_id, sender_type, sender_id, message, attachment_url, attachment_type, is_read)
     VALUES (?, 'bot', NULL, ?, NULL, NULL, 0)`,
    [conversationId, safeMessage],
  );
  const [[row]] = await connection.query(`SELECT * FROM chat_messages WHERE id = ? LIMIT 1`, [
    result.insertId,
  ]);
  if (!row) {
    const error = new Error('Failed to load bot message');
    error.statusCode = 500;
    throw error;
  }
  return mapMessageRow(row);
}

async function insertUserMessage(connection, conversationId, userId, message) {
  const safeMessage = validateMessageText(message);
  const [result] = await connection.query(
    `INSERT INTO chat_messages
     (conversation_id, sender_type, sender_id, message, attachment_url, attachment_type, is_read)
     VALUES (?, 'user', ?, ?, NULL, NULL, 0)`,
    [conversationId, userId || null, safeMessage],
  );
  const [[row]] = await connection.query(`SELECT * FROM chat_messages WHERE id = ? LIMIT 1`, [
    result.insertId,
  ]);
  if (!row) {
    const error = new Error('Failed to load user message');
    error.statusCode = 500;
    throw error;
  }
  return mapMessageRow(row);
}

async function setConversationMeta(connection, conversationId, fields) {
  const sets = [];
  const params = [];
  if (fields.chatStatus !== undefined) {
    sets.push('chat_status = ?');
    params.push(fields.chatStatus);
  }
  if (fields.isUnreadForAdmin !== undefined) {
    sets.push('is_unread_for_admin = ?');
    params.push(fields.isUnreadForAdmin ? 1 : 0);
  }
  if (fields.lastUserQuestion !== undefined) {
    sets.push('last_user_question = ?');
    params.push(fields.lastUserQuestion);
  }
  if (fields.assignedAdminId !== undefined) {
    sets.push('assigned_admin_id = ?');
    params.push(fields.assignedAdminId);
  }
  if (!sets.length) return;
  params.push(conversationId);
  await connection.query(
    `UPDATE chat_conversations SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`,
    params,
  );
}

export async function sendFaqExchange({ userId = null, guestId = null, faqId }) {
  const faq = await getFaqById(Number(faqId));
  if (!faq || !faq.isActive) {
    const error = new Error('FAQ not found');
    error.statusCode = 404;
    throw error;
  }

  const conversation = await getOrCreateConversation({ userId, guestId });
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const userMessage = await insertUserMessage(connection, conversation.id, userId, faq.question);
    const botMessage = await insertBotMessage(connection, conversation.id, faq.answer);
    await updateConversationPreview(connection, conversation.id, buildPreview(faq.answer, null, null));
    await setConversationMeta(connection, conversation.id, {
      chatStatus: 'faq_answered',
      isUnreadForAdmin: false,
      lastUserQuestion: faq.question,
    });
    await connection.commit();
    return {
      conversationId: conversation.id,
      userMessage,
      botMessage,
      messages: [userMessage, botMessage],
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function sendUserMessageWithFallback({
  userId = null,
  guestId = null,
  message = '',
  attachmentUrl = null,
  attachmentType = null,
}) {
  if (attachmentUrl) {
    const result = await sendUserChatMessage({ userId, guestId, message, attachmentUrl, attachmentType });
    const pool = getPool();
    await pool.query(
      `UPDATE chat_conversations
       SET chat_status = 'waiting_admin',
           is_unread_for_admin = 1,
           last_user_question = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [buildPreview(message, attachmentUrl, attachmentType), result.conversationId],
    );
    return { ...result, needsAdminAttention: true };
  }

  const safeMessage = validateMessageText(message);
  const settings = await getChatSettings();
  const conversation = await getOrCreateConversation({ userId, guestId });
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const userMessage = await insertUserMessage(connection, conversation.id, userId, safeMessage);
    const botMessage = await insertBotMessage(
      connection,
      conversation.id,
      settings.fallbackMessage,
    );
    await updateConversationPreview(
      connection,
      conversation.id,
      buildPreview(settings.fallbackMessage, null, null),
    );
    await setConversationMeta(connection, conversation.id, {
      chatStatus: 'waiting_admin',
      isUnreadForAdmin: true,
      lastUserQuestion: safeMessage,
    });
    await connection.commit();
    return {
      conversationId: conversation.id,
      message: userMessage,
      botMessage,
      messages: [userMessage, botMessage],
      needsAdminAttention: true,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function markConversationSeenByAdmin(conversationId) {
  const pool = getPool();
  await pool.query(
    `UPDATE chat_conversations SET is_unread_for_admin = 0, updated_at = NOW() WHERE id = ?`,
    [conversationId],
  );
  await pool.query(
    `UPDATE chat_messages SET is_read = 1
     WHERE conversation_id = ? AND sender_type = 'user' AND is_read = 0`,
    [conversationId],
  );
  return { success: true };
}

export async function markAdminReplied(conversationId, adminId = null) {
  const pool = getPool();
  await pool.query(
    `UPDATE chat_conversations
     SET chat_status = 'admin_replied',
         is_unread_for_admin = 0,
         assigned_admin_id = COALESCE(?, assigned_admin_id),
         updated_at = NOW()
     WHERE id = ?`,
    [adminId, conversationId],
  );
}
