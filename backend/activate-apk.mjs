import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDatabase } from './config/db.js';
import { saveAppDownloadSetting } from './services/appDownloadService.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APK_FILENAME = 'jowabuzz-app.apk';
const sourceApk = process.argv[2] || path.join(__dirname, 'uploads', 'app-download', APK_FILENAME);
const version = process.argv[3] || '1.0.1';

const PUBLIC_DOWNLOADS_DIR = path.join(__dirname, '..', 'frontend', 'public', 'downloads');
const DIST_DOWNLOADS_DIR = path.join(__dirname, '..', 'frontend', 'dist', 'downloads');

if (!fs.existsSync(sourceApk)) {
  console.error('APK not found:', sourceApk);
  process.exit(1);
}

for (const dir of [PUBLIC_DOWNLOADS_DIR, DIST_DOWNLOADS_DIR, path.join(__dirname, 'uploads', 'app-download')]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const targets = [
  path.join(PUBLIC_DOWNLOADS_DIR, APK_FILENAME),
  path.join(DIST_DOWNLOADS_DIR, APK_FILENAME),
  path.join(__dirname, 'uploads', 'app-download', APK_FILENAME),
];

for (const target of targets) {
  fs.copyFileSync(sourceApk, target);
}

const stats = fs.statSync(sourceApk);
const sizeMb = `${(stats.size / (1024 * 1024)).toFixed(1)} MB`;

await connectDatabase();
const setting = await saveAppDownloadSetting({
  version,
  releaseNotes: 'Jowabuzz Mobile App v1.0.1 — release-signed APK. Opens jowabuzz.com phone view. If Play Protect shows, tap Install anyway.',
  appSize: sizeMb,
  isActive: true,
  hasApk: true,
});

console.log(JSON.stringify(setting, null, 2));
process.exit(0);
