import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ACTIVE_CACHE_TTL_MS = 30_000;

let activePromotionsCache = {
  data: null,
  expiresAt: 0,
};

function invalidateActivePromotionsCache() {
  activePromotionsCache = { data: null, expiresAt: 0 };
}

function formatPromotionRow(row) {
  return {
    id: row.id,
    title: row.title,
    badge: row.badge || '',
    description: row.description,
    imageUrl: row.image_url,
    ctaLabel: row.cta_label || '',
    ctaLink: row.cta_link || '',
    displayOrder: Number(row.display_order),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isValidAssetUrl(url) {
  if (!url) return false;
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

export function validatePromotionInput(payload = {}, { requireAll = true } = {}) {
  const title = String(payload.title || '').trim();
  const badge = String(payload.badge || '').trim();
  const description = String(payload.description || '').trim();
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
    if (title.length > 200) {
      const error = new Error('Title is too long');
      error.statusCode = 400;
      throw error;
    }
  }

  if (badge.length > 80) {
    const error = new Error('Badge is too long');
    error.statusCode = 400;
    throw error;
  }

  if (requireAll || payload.description !== undefined) {
    if (!description) {
      const error = new Error('Description is required');
      error.statusCode = 400;
      throw error;
    }
    if (description.length > 5000) {
      const error = new Error('Description is too long');
      error.statusCode = 400;
      throw error;
    }
  }

  if (requireAll || payload.imageUrl !== undefined || payload.image_url !== undefined) {
    if (!imageUrl || !isValidAssetUrl(imageUrl)) {
      const error = new Error('A valid image URL is required');
      error.statusCode = 400;
      throw error;
    }
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
    badge: badge || null,
    description,
    imageUrl,
    ctaLabel: ctaLabel || null,
    ctaLink: ctaLink || null,
    displayOrder,
    isActive,
  };
}

export async function migratePromotionsSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'promotions.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

function buildAdminFilters({ search = '', status = 'all' } = {}) {
  const conditions = [];
  const params = [];
  const safeSearch = String(search || '').trim();

  if (safeSearch) {
    conditions.push('(title LIKE ? OR badge LIKE ? OR description LIKE ?)');
    const term = `%${safeSearch}%`;
    params.push(term, term, term);
  }

  if (status === 'active') {
    conditions.push('is_active = 1');
  } else if (status === 'inactive') {
    conditions.push('is_active = 0');
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
}

export async function listPromotionsAdmin({
  search = '',
  status = 'all',
  page = 1,
  limit = 10,
} = {}) {
  const pool = getPool();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (safePage - 1) * safeLimit;
  const { whereClause, params } = buildAdminFilters({ search, status });

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM promotions ${whereClause}`,
    params,
  );

  const [rows] = await pool.query(
    `SELECT id, title, badge, description, image_url, cta_label, cta_link, display_order, is_active, created_at, updated_at
     FROM promotions
     ${whereClause}
     ORDER BY display_order ASC, id DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset],
  );

  return {
    data: rows.map(formatPromotionRow),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: Number(total),
      totalPages: Math.max(1, Math.ceil(Number(total) / safeLimit)),
    },
  };
}

export async function listAllPromotions() {
  const result = await listPromotionsAdmin({ page: 1, limit: 100 });
  return result.data;
}

export async function listActivePromotions() {
  const now = Date.now();
  if (activePromotionsCache.data && activePromotionsCache.expiresAt > now) {
    return activePromotionsCache.data;
  }

  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, title, badge, description, image_url, cta_label, cta_link, display_order
     FROM promotions
     WHERE is_active = 1
     ORDER BY display_order ASC, id DESC`,
  );

  const data = rows.map((row) => ({
    id: row.id,
    title: row.title,
    badge: row.badge || '',
    description: row.description,
    imageUrl: row.image_url,
    ctaLabel: row.cta_label || 'Join Now',
    ctaLink: row.cta_link || '',
    displayOrder: Number(row.display_order),
  }));

  activePromotionsCache = {
    data,
    expiresAt: now + ACTIVE_CACHE_TTL_MS,
  };

  return data;
}

export async function getPromotionById(id, connection = null) {
  const db = connection || getPool();
  const [[row]] = await db.query(
    `SELECT id, title, badge, description, image_url, cta_label, cta_link, display_order, is_active, created_at, updated_at
     FROM promotions
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  if (!row) {
    const error = new Error('Promotion not found');
    error.statusCode = 404;
    throw error;
  }

  return formatPromotionRow(row);
}

export async function createPromotion(payload) {
  const pool = getPool();
  const data = validatePromotionInput(payload, { requireAll: true });
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO promotions (title, badge, description, image_url, cta_label, cta_link, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title,
        data.badge,
        data.description,
        data.imageUrl,
        data.ctaLabel,
        data.ctaLink,
        data.displayOrder,
        data.isActive ? 1 : 0,
      ],
    );

    const promotion = await getPromotionById(result.insertId, connection);
    await connection.commit();
    invalidateActivePromotionsCache();
    return promotion;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updatePromotion(id, payload) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const existing = await getPromotionById(id, connection);
    const merged = {
      title: payload.title ?? existing.title,
      badge: payload.badge ?? existing.badge,
      description: payload.description ?? existing.description,
      imageUrl: payload.imageUrl ?? payload.image_url ?? existing.imageUrl,
      ctaLabel: payload.ctaLabel ?? payload.cta_label ?? existing.ctaLabel,
      ctaLink: payload.ctaLink ?? payload.cta_link ?? existing.ctaLink,
      displayOrder: payload.displayOrder ?? payload.display_order ?? existing.displayOrder,
      isActive: payload.isActive ?? payload.is_active ?? existing.isActive,
    };
    const data = validatePromotionInput(merged, { requireAll: true });

    await connection.query(
      `UPDATE promotions
       SET title = ?, badge = ?, description = ?, image_url = ?, cta_label = ?, cta_link = ?, display_order = ?, is_active = ?
       WHERE id = ?`,
      [
        data.title,
        data.badge,
        data.description,
        data.imageUrl,
        data.ctaLabel,
        data.ctaLink,
        data.displayOrder,
        data.isActive ? 1 : 0,
        id,
      ],
    );

    const promotion = await getPromotionById(id, connection);
    await connection.commit();
    invalidateActivePromotionsCache();
    return promotion;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deletePromotion(id) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await getPromotionById(id, connection);
    await connection.query(`DELETE FROM promotions WHERE id = ?`, [id]);
    await connection.commit();
    invalidateActivePromotionsCache();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function reorderPromotions(ids = []) {
  const pool = getPool();
  const orderedIds = Array.isArray(ids)
    ? ids.map((value) => Number(value)).filter(Boolean)
    : [];

  if (!orderedIds.length) {
    const error = new Error('Promotion order list is required');
    error.statusCode = 400;
    throw error;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      `SELECT id FROM promotions WHERE id IN (${orderedIds.map(() => '?').join(', ')})`,
      orderedIds,
    );

    if (existingRows.length !== orderedIds.length) {
      const error = new Error('One or more promotions were not found');
      error.statusCode = 400;
      throw error;
    }

    for (let index = 0; index < orderedIds.length; index += 1) {
      await connection.query(
        `UPDATE promotions SET display_order = ? WHERE id = ?`,
        [index, orderedIds[index]],
      );
    }

    await connection.commit();
    invalidateActivePromotionsCache();
    return { success: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default {
  migratePromotionsSchema,
  listPromotionsAdmin,
  listAllPromotions,
  listActivePromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  reorderPromotions,
  invalidateActivePromotionsCache,
};
