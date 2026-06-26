import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';
import { getSiteSetting, upsertSiteSetting } from './siteSettingsService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const APP_DOWNLOAD_SETTING_KEY = 'jowabuzz_app_download';
export const APK_FILENAME = 'jowabuzz-app.apk';
export const APK_PUBLIC_URL = `/downloads/${APK_FILENAME}`;

const PUBLIC_DOWNLOADS_DIR = path.join(__dirname, '..', '..', 'frontend', 'public', 'downloads');
const DIST_DOWNLOADS_DIR = path.join(__dirname, '..', '..', 'frontend', 'dist', 'downloads');

export const DEFAULT_APP_DOWNLOAD_SETTING = {
  version: '1.0.0',
  apkUrl: APK_PUBLIC_URL,
  appSize: '',
  releaseNotes: 'Initial release of Jowabuzz Mobile App.',
  isActive: false,
  hasApk: false,
  filename: APK_FILENAME,
  updatedAt: null,
};

function splitSqlStatements(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

function apkExistsOnDisk() {
  const publicPath = path.join(PUBLIC_DOWNLOADS_DIR, APK_FILENAME);
  const distPath = path.join(DIST_DOWNLOADS_DIR, APK_FILENAME);
  return fs.existsSync(publicPath) || fs.existsSync(distPath);
}

function resolveApkDiskPath() {
  const publicPath = path.join(PUBLIC_DOWNLOADS_DIR, APK_FILENAME);
  if (fs.existsSync(publicPath)) return publicPath;
  const distPath = path.join(DIST_DOWNLOADS_DIR, APK_FILENAME);
  if (fs.existsSync(distPath)) return distPath;
  return publicPath;
}

export function normalizeAppDownloadSetting(value) {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_APP_DOWNLOAD_SETTING };
  }

  const apkUrl = String(value.apkUrl ?? value.apk_url ?? APK_PUBLIC_URL).trim() || APK_PUBLIC_URL;
  const version = String(value.version ?? DEFAULT_APP_DOWNLOAD_SETTING.version).trim();
  const appSize = String(value.appSize ?? value.app_size ?? '').trim();
  const releaseNotes = String(value.releaseNotes ?? value.release_notes ?? '').trim();
  const isActive = Boolean(value.isActive ?? value.is_active);
  const hasApk = Boolean(value.hasApk ?? value.has_apk) || apkExistsOnDisk();
  const filename = String(value.filename ?? APK_FILENAME).trim() || APK_FILENAME;

  return {
    version: version || DEFAULT_APP_DOWNLOAD_SETTING.version,
    apkUrl: apkUrl.startsWith('/') || apkUrl.startsWith('http') ? apkUrl : `/${apkUrl}`,
    appSize,
    releaseNotes: releaseNotes || DEFAULT_APP_DOWNLOAD_SETTING.releaseNotes,
    isActive,
    hasApk,
    filename,
    updatedAt: value.updatedAt ?? value.updated_at ?? null,
  };
}

export function ensureDownloadDirectories() {
  for (const dir of [PUBLIC_DOWNLOADS_DIR, DIST_DOWNLOADS_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export async function migrateAppDownloadSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'app_download_settings.sql');
  if (!fs.existsSync(schemaPath)) return true;

  const schema = fs.readFileSync(schemaPath, 'utf8');
  for (const statement of splitSqlStatements(schema)) {
    await pool.query(statement);
  }

  ensureDownloadDirectories();
  return true;
}

export async function getAppDownloadSetting() {
  const raw = await getSiteSetting(APP_DOWNLOAD_SETTING_KEY);
  const normalized = normalizeAppDownloadSetting(raw);
  normalized.hasApk = normalized.hasApk || apkExistsOnDisk();

  if (normalized.hasApk && !normalized.appSize) {
    try {
      const diskPath = resolveApkDiskPath();
      if (fs.existsSync(diskPath)) {
        const stats = fs.statSync(diskPath);
        normalized.appSize = formatFileSize(stats.size);
      }
    } catch {
      // ignore
    }
  }

  return normalized;
}

export async function saveAppDownloadSetting(payload) {
  const current = await getAppDownloadSetting();
  const normalized = normalizeAppDownloadSetting({
    ...current,
    ...payload,
    hasApk: payload?.hasApk ?? current.hasApk ?? apkExistsOnDisk(),
    updatedAt: new Date().toISOString(),
  });

  if (!normalized.version) {
    const error = new Error('App version is required');
    error.statusCode = 400;
    throw error;
  }

  if (normalized.version.length > 40) {
    const error = new Error('App version is too long');
    error.statusCode = 400;
    throw error;
  }

  if (normalized.releaseNotes.length > 5000) {
    const error = new Error('Release notes must be 5000 characters or less');
    error.statusCode = 400;
    throw error;
  }

  if (normalized.appSize.length > 40) {
    const error = new Error('App size is too long');
    error.statusCode = 400;
    throw error;
  }

  if (normalized.apkUrl && !normalized.apkUrl.startsWith('/') && !normalized.apkUrl.startsWith('http')) {
    const error = new Error('APK file URL is invalid');
    error.statusCode = 400;
    throw error;
  }

  await upsertSiteSetting(APP_DOWNLOAD_SETTING_KEY, normalized);
  return getAppDownloadSetting();
}

export async function saveUploadedApk(file) {
  if (!file?.path) {
    const error = new Error('APK file is required');
    error.statusCode = 400;
    throw error;
  }

  ensureDownloadDirectories();

  const publicTarget = path.join(PUBLIC_DOWNLOADS_DIR, APK_FILENAME);
  const distTarget = path.join(DIST_DOWNLOADS_DIR, APK_FILENAME);

  fs.copyFileSync(file.path, publicTarget);
  fs.copyFileSync(file.path, distTarget);

  try {
    fs.unlinkSync(file.path);
  } catch {
    // ignore temp cleanup
  }

  const stats = fs.statSync(publicTarget);
  const current = await getAppDownloadSetting();

  return saveAppDownloadSetting({
    version: current.version,
    apkUrl: APK_PUBLIC_URL,
    appSize: formatFileSize(stats.size),
    releaseNotes: current.releaseNotes,
    isActive: true,
    hasApk: true,
    filename: APK_FILENAME,
  });
}

export async function removeAppApkFile() {
  for (const target of [
    path.join(PUBLIC_DOWNLOADS_DIR, APK_FILENAME),
    path.join(DIST_DOWNLOADS_DIR, APK_FILENAME),
  ]) {
    try {
      if (fs.existsSync(target)) fs.unlinkSync(target);
    } catch {
      // ignore
    }
  }

  const current = await getAppDownloadSetting();
  return saveAppDownloadSetting({
    ...current,
    hasApk: false,
    apkUrl: APK_PUBLIC_URL,
  });
}

export function getPublicAppDownloadInfo(setting) {
  const normalized = normalizeAppDownloadSetting(setting);
  const available = normalized.isActive && normalized.hasApk;

  return {
    appName: 'Jowabuzz Mobile App',
    version: normalized.version,
    appSize: normalized.appSize,
    releaseNotes: normalized.releaseNotes,
    downloadUrl: available ? normalized.apkUrl : null,
    available,
    comingSoonMessage: available ? null : 'App coming soon',
    features: [
      'Fast & Smooth Experience',
      'Secure Account Access',
      'Real-time Balance Sync',
      'Instant Notifications',
      'Mobile Optimized Interface',
      'Easy Navigation',
      '24/7 Customer Support',
    ],
  };
}
