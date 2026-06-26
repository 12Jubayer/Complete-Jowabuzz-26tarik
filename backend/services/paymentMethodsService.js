import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function formatPaymentMethodRow(row) {
  return {
    id: row.id,
    name: row.name,
    accountNumber: row.account_number,
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function validatePaymentMethodInput(method, index) {
  const name = String(method.name || '').trim();
  const accountNumber = String(method.accountNumber || method.account_number || '').trim();

  if (!name) {
    const error = new Error(`Payment method #${index + 1}: name is required`);
    error.statusCode = 400;
    throw error;
  }

  if (!accountNumber) {
    const error = new Error(`Payment method #${index + 1}: account number is required`);
    error.statusCode = 400;
    throw error;
  }

  if (name.length > 120) {
    const error = new Error(`Payment method #${index + 1}: name is too long`);
    error.statusCode = 400;
    throw error;
  }

  if (accountNumber.length > 50) {
    const error = new Error(`Payment method #${index + 1}: account number is too long`);
    error.statusCode = 400;
    throw error;
  }

  return {
    id: method.id ? Number(method.id) : null,
    name,
    accountNumber,
    isActive: method.isActive !== false && method.is_active !== false,
  };
}

export async function migratePaymentMethodsSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'payment_methods.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM payment_methods`);

  if (Number(total) === 0) {
    await pool.query(
      `INSERT INTO payment_methods (name, account_number, is_active, sort_order)
       VALUES (?, ?, 1, 0), (?, ?, 1, 1), (?, ?, 1, 2)`,
      ['bKash', '01xxxxxxxxxx', 'Nagad', '01xxxxxxxxxx', 'Rocket', '01xxxxxxxxxx'],
    );
  } else {
    const defaultMethods = [
      ['bKash', '01xxxxxxxxxx', 0],
      ['Nagad', '01xxxxxxxxxx', 1],
      ['Rocket', '01xxxxxxxxxx', 2],
    ];

    for (const [name, accountNumber, sortOrder] of defaultMethods) {
      const [[existingMethod]] = await pool.query(
        `SELECT id FROM payment_methods WHERE LOWER(name) LIKE ? LIMIT 1`,
        [`%${name.toLowerCase()}%`],
      );

      if (!existingMethod) {
        await pool.query(
          `INSERT INTO payment_methods (name, account_number, is_active, sort_order)
           VALUES (?, ?, 1, ?)`,
          [name, accountNumber, sortOrder],
        );
      }
    }
  }
}

export async function listAllPaymentMethods() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, name, account_number, is_active, sort_order, created_at, updated_at
     FROM payment_methods
     ORDER BY sort_order ASC, id ASC`,
  );

  return rows.map(formatPaymentMethodRow);
}

export async function listActivePaymentMethods() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, name, account_number, is_active, sort_order
     FROM payment_methods
     WHERE is_active = 1
     ORDER BY sort_order ASC, id ASC`,
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    accountNumber: row.account_number,
  }));
}

export async function savePaymentMethods(methodsInput = []) {
  if (!Array.isArray(methodsInput)) {
    const error = new Error('Methods must be an array');
    error.statusCode = 400;
    throw error;
  }

  const methods = methodsInput.map((method, index) => validatePaymentMethodInput(method, index));
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query(`SELECT id FROM payment_methods`);
    const existingIds = new Set(existingRows.map((row) => row.id));
    const keptIds = new Set();

    for (let index = 0; index < methods.length; index += 1) {
      const method = methods[index];

      if (method.id && existingIds.has(method.id)) {
        await connection.query(
          `UPDATE payment_methods
           SET name = ?, account_number = ?, is_active = ?, sort_order = ?
           WHERE id = ?`,
          [method.name, method.accountNumber, method.isActive ? 1 : 0, index, method.id],
        );
        keptIds.add(method.id);
      } else {
        const [result] = await connection.query(
          `INSERT INTO payment_methods (name, account_number, is_active, sort_order)
           VALUES (?, ?, ?, ?)`,
          [method.name, method.accountNumber, method.isActive ? 1 : 0, index],
        );
        keptIds.add(result.insertId);
      }
    }

    const idsToDelete = [...existingIds].filter((id) => !keptIds.has(id));
    if (idsToDelete.length) {
      await connection.query(`DELETE FROM payment_methods WHERE id IN (?)`, [idsToDelete]);
    }

    await connection.commit();
    return listAllPaymentMethods();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default {
  migratePaymentMethodsSchema,
  listAllPaymentMethods,
  listActivePaymentMethods,
  savePaymentMethods,
};
