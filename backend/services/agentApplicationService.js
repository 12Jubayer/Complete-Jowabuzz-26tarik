import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VALID_STATUSES = ['new', 'contacted', 'approved', 'rejected'];

function formatRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    country: row.country,
    phone: row.phone,
    telegram: row.telegram || '',
    message: row.message || '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeInput(payload = {}) {
  return {
    name: String(payload.name || '').trim(),
    email: String(payload.email || '').trim().toLowerCase(),
    country: String(payload.country || '').trim(),
    phone: String(payload.phone || '').trim(),
    telegram: String(payload.telegram || payload.nickname || '').trim(),
    message: String(payload.message || '').trim(),
  };
}

function validateApplicationInput(data) {
  if (!data.name || data.name.length > 120) {
    const error = new Error('Name is required');
    error.statusCode = 400;
    throw error;
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    const error = new Error('Valid email is required');
    error.statusCode = 400;
    throw error;
  }

  if (!data.country || data.country.length > 120) {
    const error = new Error('Country is required');
    error.statusCode = 400;
    throw error;
  }

  if (!data.phone || data.phone.length > 50) {
    const error = new Error('Phone is required');
    error.statusCode = 400;
    throw error;
  }

  if (data.telegram.length > 120) {
    const error = new Error('Telegram username is too long');
    error.statusCode = 400;
    throw error;
  }

  if (data.message.length > 5000) {
    const error = new Error('Message is too long');
    error.statusCode = 400;
    throw error;
  }

  return data;
}

export async function migrateAgentApplicationsSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'agent_applications.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

export async function createAgentApplication(payload) {
  const data = validateApplicationInput(normalizeInput(payload));
  const pool = getPool();

  const [result] = await pool.query(
    `INSERT INTO agent_applications (name, email, country, phone, telegram, message, status)
     VALUES (?, ?, ?, ?, ?, ?, 'new')`,
    [data.name, data.email, data.country, data.phone, data.telegram || null, data.message || null],
  );

  return getAgentApplicationById(result.insertId);
}

export async function getAgentApplicationById(id) {
  const pool = getPool();
  const [[row]] = await pool.query(
    `SELECT id, name, email, country, phone, telegram, message, status, created_at, updated_at
     FROM agent_applications
     WHERE id = ?
     LIMIT 1`,
    [Number(id)],
  );

  if (!row) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }

  return formatRow(row);
}

export async function listAgentApplications(filters = {}) {
  const pool = getPool();
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const offset = (page - 1) * limit;
  const status = String(filters.status || '').trim().toLowerCase();
  const search = String(filters.search || '').trim();

  const where = [];
  const params = [];

  if (status && status !== 'all' && VALID_STATUSES.includes(status)) {
    where.push('status = ?');
    params.push(status);
  }

  if (search) {
    where.push(
      '(name LIKE ? OR email LIKE ? OR phone LIKE ? OR country LIKE ? OR telegram LIKE ?)',
    );
    const term = `%${search}%`;
    params.push(term, term, term, term, term);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM agent_applications ${whereSql}`,
    params,
  );

  const [rows] = await pool.query(
    `SELECT id, name, email, country, phone, telegram, message, status, created_at, updated_at
     FROM agent_applications
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return {
    data: rows.map(formatRow),
    total: Number(total || 0),
    page,
    limit,
  };
}

export async function updateAgentApplicationStatus(id, status) {
  const normalized = String(status || '').trim().toLowerCase();

  if (!VALID_STATUSES.includes(normalized)) {
    const error = new Error('Invalid status');
    error.statusCode = 400;
    throw error;
  }

  const pool = getPool();
  const [result] = await pool.query(
    `UPDATE agent_applications SET status = ? WHERE id = ?`,
    [normalized, Number(id)],
  );

  if (!result.affectedRows) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }

  return getAgentApplicationById(id);
}

export async function deleteAgentApplication(id) {
  const pool = getPool();
  const [result] = await pool.query(`DELETE FROM agent_applications WHERE id = ?`, [Number(id)]);

  if (!result.affectedRows) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }

  return { success: true };
}

export default {
  migrateAgentApplicationsSchema,
  createAgentApplication,
  getAgentApplicationById,
  listAgentApplications,
  updateAgentApplicationStatus,
  deleteAgentApplication,
};
