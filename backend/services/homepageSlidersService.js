import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function formatSliderRow(row) {
  return {
    id: row.id,
    title: row.title || '',
    imageUrl: row.image_url,
    linkUrl: row.link_url || '',
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function validateSliderInput(slider, index) {
  const title = String(slider.title || '').trim();
  const imageUrl = String(slider.imageUrl || slider.image_url || '').trim();
  const linkUrl = String(slider.linkUrl || slider.link_url || '').trim();

  if (!imageUrl) {
    const error = new Error(`Slider #${index + 1}: image URL is required`);
    error.statusCode = 400;
    throw error;
  }

  if (imageUrl.length > 500) {
    const error = new Error(`Slider #${index + 1}: image URL is too long`);
    error.statusCode = 400;
    throw error;
  }

  if (title.length > 200) {
    const error = new Error(`Slider #${index + 1}: title is too long`);
    error.statusCode = 400;
    throw error;
  }

  if (linkUrl.length > 500) {
    const error = new Error(`Slider #${index + 1}: link URL is too long`);
    error.statusCode = 400;
    throw error;
  }

  return {
    id: slider.id ? Number(slider.id) : null,
    title: title || null,
    imageUrl,
    linkUrl: linkUrl || null,
    isActive: slider.isActive !== false && slider.is_active !== false,
  };
}

export async function migrateHomepageSlidersSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'homepage_sliders.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

export async function listAllHomepageSliders() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, title, image_url, link_url, is_active, sort_order, created_at, updated_at
     FROM homepage_sliders
     ORDER BY sort_order ASC, id ASC`,
  );

  return rows.map(formatSliderRow);
}

export async function listActiveHomepageSliders() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, title, image_url, link_url, sort_order
     FROM homepage_sliders
     WHERE is_active = 1
     ORDER BY sort_order ASC, id ASC`,
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title || '',
    imageUrl: row.image_url,
    linkUrl: row.link_url || '',
  }));
}

export async function saveHomepageSliders(slidersInput = []) {
  if (!Array.isArray(slidersInput)) {
    const error = new Error('Sliders must be an array');
    error.statusCode = 400;
    throw error;
  }

  const sliders = slidersInput.map((slider, index) => validateSliderInput(slider, index));
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query(`SELECT id FROM homepage_sliders`);
    const existingIds = new Set(existingRows.map((row) => row.id));
    const keptIds = new Set();

    for (let index = 0; index < sliders.length; index += 1) {
      const slider = sliders[index];

      if (slider.id && existingIds.has(slider.id)) {
        await connection.query(
          `UPDATE homepage_sliders
           SET title = ?, image_url = ?, link_url = ?, is_active = ?, sort_order = ?
           WHERE id = ?`,
          [
            slider.title,
            slider.imageUrl,
            slider.linkUrl,
            slider.isActive ? 1 : 0,
            index,
            slider.id,
          ],
        );
        keptIds.add(slider.id);
      } else {
        const [result] = await connection.query(
          `INSERT INTO homepage_sliders (title, image_url, link_url, is_active, sort_order)
           VALUES (?, ?, ?, ?, ?)`,
          [slider.title, slider.imageUrl, slider.linkUrl, slider.isActive ? 1 : 0, index],
        );
        keptIds.add(result.insertId);
      }
    }

    const idsToDelete = [...existingIds].filter((id) => !keptIds.has(id));
    if (idsToDelete.length) {
      await connection.query(`DELETE FROM homepage_sliders WHERE id IN (?)`, [idsToDelete]);
    }

    await connection.commit();
    return listAllHomepageSliders();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default {
  migrateHomepageSlidersSchema,
  listAllHomepageSliders,
  listActiveHomepageSliders,
  saveHomepageSliders,
};
