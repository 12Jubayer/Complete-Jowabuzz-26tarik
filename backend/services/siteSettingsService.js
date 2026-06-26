import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const NOTICE_SETTING_KEY = 'notice';
export const SOCIAL_LINKS_SETTING_KEY = 'social_links';
export const BRANDING_SETTING_KEY = 'branding';

export const DEFAULT_NOTICE_SETTING = {
  enabled: true,
  text: 'Welcome to JowaBuzz!',
};

export const DEFAULT_SOCIAL_LINKS = {
  facebook: '',
  telegram: '',
  whatsapp: '',
  instagram: '',
  youtube: '',
};

export const SOCIAL_LINK_KEYS = Object.keys(DEFAULT_SOCIAL_LINKS);

export const DEFAULT_BRANDING = {
  siteName: 'JowaBuzz',
  currency: 'BDT',
  logoUrl: '/images/logo.png',
  faviconUrl: '/images/logo.png',
};

export function normalizeBranding(value) {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_BRANDING };
  }

  return {
    siteName: String(value.siteName ?? value.site_name ?? DEFAULT_BRANDING.siteName).trim(),
    currency: String(value.currency ?? DEFAULT_BRANDING.currency)
      .trim()
      .replace(/\.$/, ''),
    logoUrl: String(value.logoUrl ?? value.logo_url ?? '').trim(),
    faviconUrl: String(value.faviconUrl ?? value.favicon_url ?? '').trim(),
  };
}

function isValidAssetUrl(url) {
  if (!url) return true;
  if (url.startsWith('/')) return url.length <= 500;
  return isValidHttpUrl(url) && url.length <= 500;
}

export function normalizeSocialLinks(value) {
  const normalized = { ...DEFAULT_SOCIAL_LINKS };

  if (!value || typeof value !== 'object') {
    return normalized;
  }

  for (const key of SOCIAL_LINK_KEYS) {
    normalized[key] = String(value[key] ?? '').trim();
  }

  return normalized;
}

function isValidHttpUrl(url) {
  if (!url) return true;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeNoticeSetting(value) {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_NOTICE_SETTING };
  }

  return {
    enabled: Boolean(value.enabled),
    text: String(value.text ?? DEFAULT_NOTICE_SETTING.text).trim(),
  };
}

export async function migrateSiteSettingsSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'site_settings.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }

  const [[existing]] = await pool.query(
    `SELECT id FROM site_settings WHERE setting_key = ? LIMIT 1`,
    [NOTICE_SETTING_KEY],
  );

  if (!existing) {
    await pool.query(
      `INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)`,
      [NOTICE_SETTING_KEY, JSON.stringify(DEFAULT_NOTICE_SETTING)],
    );
  }

  const [[socialExisting]] = await pool.query(
    `SELECT id FROM site_settings WHERE setting_key = ? LIMIT 1`,
    [SOCIAL_LINKS_SETTING_KEY],
  );

  if (!socialExisting) {
    await pool.query(
      `INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)`,
      [SOCIAL_LINKS_SETTING_KEY, JSON.stringify(DEFAULT_SOCIAL_LINKS)],
    );
  }

  const [[brandingExisting]] = await pool.query(
    `SELECT id FROM site_settings WHERE setting_key = ? LIMIT 1`,
    [BRANDING_SETTING_KEY],
  );

  if (!brandingExisting) {
    await pool.query(
      `INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)`,
      [BRANDING_SETTING_KEY, JSON.stringify(DEFAULT_BRANDING)],
    );
  } else {
    const brandingValue = await getSiteSetting(BRANDING_SETTING_KEY);
    const branding = normalizeBranding(brandingValue);
    let changed = false;

    if (!branding.logoUrl || branding.logoUrl.includes('logo.svg')) {
      branding.logoUrl = DEFAULT_BRANDING.logoUrl;
      changed = true;
    }

    if (!branding.faviconUrl || branding.faviconUrl.includes('logo.svg')) {
      branding.faviconUrl = DEFAULT_BRANDING.faviconUrl;
      changed = true;
    }

    if (changed) {
      await upsertSiteSetting(BRANDING_SETTING_KEY, branding);
    }
  }
}

export async function getSiteSetting(key, connection = null) {
  const db = connection || getPool();
  const [[row]] = await db.query(
    `SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1`,
    [key],
  );

  if (!row) return null;

  if (typeof row.setting_value === 'object') {
    return row.setting_value;
  }

  try {
    return JSON.parse(row.setting_value);
  } catch {
    return null;
  }
}

export async function upsertSiteSetting(key, value, connection = null) {
  const db = connection || getPool();
  const jsonValue = JSON.stringify(value);

  await db.query(
    `INSERT INTO site_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
    [key, jsonValue],
  );
}

export async function getNoticeSetting() {
  const value = await getSiteSetting(NOTICE_SETTING_KEY);
  return normalizeNoticeSetting(value);
}

export async function saveNoticeSetting(payload) {
  const normalized = normalizeNoticeSetting(payload);

  if (!normalized.text) {
    const error = new Error('Notice text is required');
    error.statusCode = 400;
    throw error;
  }

  if (normalized.text.length > 2000) {
    const error = new Error('Notice text must be 2000 characters or less');
    error.statusCode = 400;
    throw error;
  }

  await upsertSiteSetting(NOTICE_SETTING_KEY, normalized);
  return normalized;
}

export async function getSocialLinksSetting() {
  const value = await getSiteSetting(SOCIAL_LINKS_SETTING_KEY);
  return normalizeSocialLinks(value);
}

export async function saveSocialLinksSetting(payload) {
  const normalized = normalizeSocialLinks(payload);

  for (const key of SOCIAL_LINK_KEYS) {
    const url = normalized[key];
    if (url && !isValidHttpUrl(url)) {
      const error = new Error(`${key.charAt(0).toUpperCase()}${key.slice(1)} URL is invalid`);
      error.statusCode = 400;
      throw error;
    }

    if (url.length > 500) {
      const error = new Error(`${key.charAt(0).toUpperCase()}${key.slice(1)} URL is too long`);
      error.statusCode = 400;
      throw error;
    }
  }

  await upsertSiteSetting(SOCIAL_LINKS_SETTING_KEY, normalized);
  return normalized;
}

export async function getBrandingSetting() {
  const value = await getSiteSetting(BRANDING_SETTING_KEY);
  return normalizeBranding(value);
}

export async function saveBrandingSetting(payload) {
  const normalized = normalizeBranding(payload);

  if (!normalized.siteName) {
    const error = new Error('Site name is required');
    error.statusCode = 400;
    throw error;
  }

  if (normalized.siteName.length > 120) {
    const error = new Error('Site name is too long');
    error.statusCode = 400;
    throw error;
  }

  if (!normalized.currency) {
    const error = new Error('Currency is required');
    error.statusCode = 400;
    throw error;
  }

  if (normalized.currency.length > 20) {
    const error = new Error('Currency is too long');
    error.statusCode = 400;
    throw error;
  }

  if (!isValidAssetUrl(normalized.logoUrl)) {
    const error = new Error('Logo URL is invalid');
    error.statusCode = 400;
    throw error;
  }

  if (!isValidAssetUrl(normalized.faviconUrl)) {
    const error = new Error('Favicon URL is invalid');
    error.statusCode = 400;
    throw error;
  }

  await upsertSiteSetting(BRANDING_SETTING_KEY, normalized);
  return normalized;
}

export default {
  migrateSiteSettingsSchema,
  getNoticeSetting,
  saveNoticeSetting,
  normalizeNoticeSetting,
  DEFAULT_NOTICE_SETTING,
  getSocialLinksSetting,
  saveSocialLinksSetting,
  normalizeSocialLinks,
  DEFAULT_SOCIAL_LINKS,
  getBrandingSetting,
  saveBrandingSetting,
  normalizeBranding,
  DEFAULT_BRANDING,
};
