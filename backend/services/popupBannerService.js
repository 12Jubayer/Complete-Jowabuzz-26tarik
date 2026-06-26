import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function formatPopupBannerRow(row) {
  return {
    id: row.id,
    title: row.title,
    heading: row.heading,
    body: row.body,
    imageUrl: row.image_url || '',
    ctaLabel: row.cta_label || '',
    ctaLink: row.cta_link || '',
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

function isValidCtaLink(link) {
  if (!link) return true;
  if (link.startsWith('/')) return link.length <= 500;
  try {
    const parsed = new URL(link);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && link.length <= 500;
  } catch {
    return false;
  }
}

export function validatePopupBannerInput(payload = {}, { requireAll = true } = {}) {
  const title = String(payload.title || '').trim();
  const heading = String(payload.heading || '').trim();
  const body = String(payload.body || '').trim();
  const imageUrl = String(payload.imageUrl || payload.image_url || '').trim();
  const ctaLabel = String(payload.ctaLabel || payload.cta_label || '').trim();
  const ctaLink = String(payload.ctaLink || payload.cta_link || '').trim();
  const displayOrder = Number(payload.displayOrder ?? payload.display_order ?? 0);
  const isActive = payload.isActive !== false && payload.is_active !== false;

  if (requireAll || payload.title !== undefined) {
    if (!title) {
      const error = new Error('Title is required');
      error.statusCode = 400;
      throw error;
    }
    if (title.length > 120) {
      const error = new Error('Title is too long');
      error.statusCode = 400;
      throw error;
    }
  }

  if (requireAll || payload.heading !== undefined) {
    if (!heading) {
      const error = new Error('Heading is required');
      error.statusCode = 400;
      throw error;
    }
    if (heading.length > 255) {
      const error = new Error('Heading is too long');
      error.statusCode = 400;
      throw error;
    }
  }

  if (requireAll || payload.body !== undefined) {
    if (!body) {
      const error = new Error('Body is required');
      error.statusCode = 400;
      throw error;
    }
    if (body.length > 5000) {
      const error = new Error('Body is too long');
      error.statusCode = 400;
      throw error;
    }
  }

  if (imageUrl && !isValidOptionalUrl(imageUrl)) {
    const error = new Error('Image URL must be a valid http(s) or relative path');
    error.statusCode = 400;
    throw error;
  }

  if (ctaLabel.length > 120) {
    const error = new Error('CTA label is too long');
    error.statusCode = 400;
    throw error;
  }

  if (ctaLink && !isValidCtaLink(ctaLink)) {
    const error = new Error('CTA link must be a valid http(s) or relative path');
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
    heading,
    body,
    imageUrl: imageUrl || null,
    ctaLabel: ctaLabel || null,
    ctaLink: ctaLink || null,
    displayOrder,
    isActive,
  };
}

export async function migratePopupBannersSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'popup_banners.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

export async function listAllPopupBanners() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, title, heading, body, image_url, cta_label, cta_link, display_order, is_active, created_at, updated_at
     FROM popup_banners
     ORDER BY display_order ASC, id ASC`,
  );

  return rows.map(formatPopupBannerRow);
}

export async function listActivePopupBanners() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, title, heading, body, image_url, cta_label, cta_link, display_order
     FROM popup_banners
     WHERE is_active = 1
     ORDER BY display_order ASC, id ASC`,
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    heading: row.heading,
    body: row.body,
    imageUrl: row.image_url || '',
    ctaLabel: row.cta_label || '',
    ctaLink: row.cta_link || '',
    displayOrder: Number(row.display_order),
  }));
}

export async function getPopupBannerById(id) {
  const pool = getPool();
  const [[row]] = await pool.query(
    `SELECT id, title, heading, body, image_url, cta_label, cta_link, display_order, is_active, created_at, updated_at
     FROM popup_banners WHERE id = ? LIMIT 1`,
    [id],
  );

  if (!row) {
    const error = new Error('Popup banner not found');
    error.statusCode = 404;
    throw error;
  }

  return formatPopupBannerRow(row);
}

export async function createPopupBanner(payload) {
  const pool = getPool();
  const data = validatePopupBannerInput(payload, { requireAll: true });

  const [result] = await pool.query(
    `INSERT INTO popup_banners
      (title, heading, body, image_url, cta_label, cta_link, display_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.heading,
      data.body,
      data.imageUrl,
      data.ctaLabel,
      data.ctaLink,
      data.displayOrder,
      data.isActive ? 1 : 0,
    ],
  );

  return getPopupBannerById(result.insertId);
}

export async function updatePopupBanner(id, payload) {
  const pool = getPool();
  await getPopupBannerById(id);
  const data = validatePopupBannerInput(payload, { requireAll: false });

  await pool.query(
    `UPDATE popup_banners
     SET title = ?, heading = ?, body = ?, image_url = ?, cta_label = ?, cta_link = ?, display_order = ?, is_active = ?
     WHERE id = ?`,
    [
      data.title,
      data.heading,
      data.body,
      data.imageUrl,
      data.ctaLabel,
      data.ctaLink,
      data.displayOrder,
      data.isActive ? 1 : 0,
      id,
    ],
  );

  return getPopupBannerById(id);
}

export async function deletePopupBanner(id) {
  const pool = getPool();
  await getPopupBannerById(id);
  await pool.query(`DELETE FROM popup_banners WHERE id = ?`, [id]);
  return { success: true };
}

export default {
  migratePopupBannersSchema,
  listAllPopupBanners,
  listActivePopupBanners,
  createPopupBanner,
  updatePopupBanner,
  deletePopupBanner,
};
