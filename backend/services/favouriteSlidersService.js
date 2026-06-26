import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import { deleteManagedSliderImage } from '../middleware/sliderImageUpload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function formatFavouriteSliderRow(row) {
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.image_url || '',
    linkUrl: row.link_url || '',
    displayOrder: Number(row.display_order),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isValidOptionalUrl(url) {
  if (!url) return true;
  if (url.startsWith('/')) return url.length <= 500;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && url.length <= 500;
  } catch {
    return false;
  }
}

export function validateFavouriteSliderInput(payload = {}, { requireAll = true } = {}) {
  const title = String(payload.title || '').trim();
  const imageUrl = String(payload.imageUrl || payload.image_url || '').trim();
  const linkUrl = String(payload.linkUrl || payload.link_url || '').trim();
  const displayOrder = Number(payload.displayOrder ?? payload.display_order ?? 0);
  const isActive = payload.isActive !== false && payload.is_active !== false;

  if (requireAll || payload.title !== undefined) {
    if (!title) {
      const error = new Error('Title is required');
      error.statusCode = 400;
      throw error;
    }
    if (title.length > 200) {
      const error = new Error('Title is too long');
      error.statusCode = 400;
      throw error;
    }
  }

  if (requireAll || payload.imageUrl !== undefined || payload.image_url !== undefined) {
    if (!imageUrl) {
      const error = new Error('Image URL is required');
      error.statusCode = 400;
      throw error;
    }
    if (!isValidOptionalUrl(imageUrl)) {
      const error = new Error('Image URL must be a valid http(s) or relative path');
      error.statusCode = 400;
      throw error;
    }
  }

  if (linkUrl && !isValidOptionalUrl(linkUrl)) {
    const error = new Error('Link URL must be a valid http(s) or relative path');
    error.statusCode = 400;
    throw error;
  }

  if (Number.isNaN(displayOrder)) {
    const error = new Error('Display order must be a number');
    error.statusCode = 400;
    throw error;
  }

  return {
    title,
    imageUrl,
    linkUrl: linkUrl || null,
    displayOrder,
    isActive,
  };
}

export async function migrateFavouriteSlidersSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'favourite_sliders.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

export async function listAllFavouriteSliders() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, title, image_url, link_url, display_order, is_active, created_at, updated_at
     FROM favourite_sliders
     ORDER BY display_order ASC, id ASC`,
  );

  return rows.map(formatFavouriteSliderRow);
}

export async function listActiveFavouriteSliders() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, title, image_url, link_url, display_order
     FROM favourite_sliders
     WHERE is_active = 1
     ORDER BY display_order ASC, id ASC`,
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    imageUrl: row.image_url || '',
    linkUrl: row.link_url || '',
    displayOrder: Number(row.display_order),
  }));
}

export async function getFavouriteSliderById(id) {
  const pool = getPool();
  const [[row]] = await pool.query(
    `SELECT id, title, image_url, link_url, display_order, is_active, created_at, updated_at
     FROM favourite_sliders WHERE id = ? LIMIT 1`,
    [id],
  );

  if (!row) {
    const error = new Error('Favourite slider not found');
    error.statusCode = 404;
    throw error;
  }

  return formatFavouriteSliderRow(row);
}

export async function createFavouriteSlider(payload) {
  const pool = getPool();
  const data = validateFavouriteSliderInput(payload, { requireAll: true });

  const [result] = await pool.query(
    `INSERT INTO favourite_sliders
      (title, image_url, link_url, display_order, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.title,
      data.imageUrl,
      data.linkUrl,
      data.displayOrder,
      data.isActive ? 1 : 0,
    ],
  );

  return getFavouriteSliderById(result.insertId);
}

export async function updateFavouriteSlider(id, payload) {
  const pool = getPool();
  const existing = await getFavouriteSliderById(id);
  const data = validateFavouriteSliderInput(
    {
      title: payload.title ?? existing.title,
      imageUrl: payload.imageUrl ?? payload.image_url ?? existing.imageUrl,
      linkUrl: payload.linkUrl ?? payload.link_url ?? existing.linkUrl,
      displayOrder: payload.displayOrder ?? payload.display_order ?? existing.displayOrder,
      isActive: payload.isActive ?? payload.is_active ?? existing.isActive,
    },
    { requireAll: false },
  );

  if (data.imageUrl !== existing.imageUrl) {
    deleteManagedSliderImage(existing.imageUrl);
  }

  await pool.query(
    `UPDATE favourite_sliders
     SET title = ?, image_url = ?, link_url = ?, display_order = ?, is_active = ?
     WHERE id = ?`,
    [
      data.title,
      data.imageUrl,
      data.linkUrl,
      data.displayOrder,
      data.isActive ? 1 : 0,
      id,
    ],
  );

  return getFavouriteSliderById(id);
}

export async function deleteFavouriteSlider(id) {
  const pool = getPool();
  const existing = await getFavouriteSliderById(id);
  await pool.query(`DELETE FROM favourite_sliders WHERE id = ?`, [id]);
  deleteManagedSliderImage(existing.imageUrl);
  return { success: true };
}

export default {
  migrateFavouriteSlidersSchema,
  listAllFavouriteSliders,
  listActiveFavouriteSliders,
  createFavouriteSlider,
  updateFavouriteSlider,
  deleteFavouriteSlider,
};
