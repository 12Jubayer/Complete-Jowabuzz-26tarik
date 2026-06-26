import { getPool } from '../config/db.js';

const PLACEHOLDER_IMAGE = '/images/game-placeholder.svg';

export function resolveGameImage(row) {
  const custom = String(row.custom_image_url || '').trim();
  const fallback = String(row.image_url || '').trim();
  return custom || fallback || PLACEHOLDER_IMAGE;
}

function mapGameImageRow(row) {
  return {
    id: row.id,
    gameName: row.name,
    providerId: row.provider_id,
    providerCode: row.provider_code,
    providerName: row.provider_name,
    imageUrl: row.image_url,
    customImageUrl: row.custom_image_url || null,
    displayImageUrl: resolveGameImage(row),
    hasCustomImage: Boolean(String(row.custom_image_url || '').trim()),
    updatedAt: row.updated_at,
  };
}

function buildFilters({ providerId = '', imageStatus = 'all', search = '' }) {
  const conditions = ['1=1'];
  const params = [];

  if (providerId) {
    conditions.push('g.provider_id = ?');
    params.push(Number(providerId));
  }

  const status = String(imageStatus || 'all').trim().toLowerCase();
  if (status === 'with_custom') {
    conditions.push(`(g.custom_image_url IS NOT NULL AND TRIM(g.custom_image_url) <> '')`);
  } else if (status === 'without_custom') {
    conditions.push(`(g.custom_image_url IS NULL OR TRIM(g.custom_image_url) = '')`);
  }

  const term = String(search || '').trim();
  if (term) {
    conditions.push('g.name LIKE ?');
    params.push(`%${term}%`);
  }

  return { whereClause: conditions.join(' AND '), params };
}

export async function getGameImageStats() {
  const pool = getPool();

  const [[gameStats]] = await pool.query(
    `SELECT
       COUNT(*) AS totalGames,
       SUM(CASE WHEN custom_image_url IS NOT NULL AND TRIM(custom_image_url) <> '' THEN 1 ELSE 0 END) AS customImages
     FROM games`,
  );

  const [[providerStats]] = await pool.query(`SELECT COUNT(*) AS totalProviders FROM providers`);

  const totalGames = Number(gameStats.totalGames || 0);
  const customImages = Number(gameStats.customImages || 0);

  return {
    totalGames,
    customImages,
    withoutCustom: Math.max(0, totalGames - customImages),
    totalProviders: Number(providerStats.totalProviders || 0),
  };
}

export async function listAdminGameImages({
  providerId = '',
  imageStatus = 'all',
  search = '',
  page = 1,
  limit = 48,
} = {}) {
  const pool = getPool();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 48));
  const offset = (safePage - 1) * safeLimit;

  const { whereClause, params } = buildFilters({ providerId, imageStatus, search });

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM games g
     INNER JOIN providers p ON p.id = g.provider_id
     WHERE ${whereClause}`,
    params,
  );

  const [rows] = await pool.query(
    `SELECT g.id, g.name, g.provider_id, g.image_url, g.custom_image_url, g.updated_at,
            p.code AS provider_code, p.name AS provider_name
     FROM games g
     INNER JOIN providers p ON p.id = g.provider_id
     WHERE ${whereClause}
     ORDER BY g.name ASC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset],
  );

  const totalRecords = Number(countRow.total || 0);

  return {
    stats: await getGameImageStats(),
    providers: await listGameImageProviders(),
    data: rows.map(mapGameImageRow),
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalRecords,
      totalPages: Math.max(1, Math.ceil(totalRecords / safeLimit)),
    },
  };
}

export async function getAdminGameImageById(gameId) {
  const pool = getPool();
  const [[row]] = await pool.query(
    `SELECT g.id, g.name, g.provider_id, g.image_url, g.custom_image_url, g.updated_at,
            p.code AS provider_code, p.name AS provider_name
     FROM games g
     INNER JOIN providers p ON p.id = g.provider_id
     WHERE g.id = ?
     LIMIT 1`,
    [gameId],
  );

  return row ? mapGameImageRow(row) : null;
}

export async function updateAdminGameImage(gameId, customImageUrl) {
  const pool = getPool();
  const url = String(customImageUrl || '').trim();

  if (!url) {
    const error = new Error('Image URL is required');
    error.statusCode = 400;
    throw error;
  }

  if (url.length > 500) {
    const error = new Error('Image URL is too long');
    error.statusCode = 400;
    throw error;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `UPDATE games
       SET custom_image_url = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [url, gameId],
    );

    if (!result.affectedRows) {
      const error = new Error('Game not found');
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

  return getAdminGameImageById(gameId);
}

export async function removeAdminGameCustomImage(gameId) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `UPDATE games
       SET custom_image_url = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [gameId],
    );

    if (!result.affectedRows) {
      const error = new Error('Game not found');
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

  return getAdminGameImageById(gameId);
}

export async function listGameImageProviders() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, code, name
     FROM providers
     ORDER BY name ASC`,
  );

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
  }));
}

export default {
  resolveGameImage,
  getGameImageStats,
  listAdminGameImages,
  getAdminGameImageById,
  updateAdminGameImage,
  removeAdminGameCustomImage,
  listGameImageProviders,
};
