import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import {
  deleteAdminAppDownloadApk,
  getAdminAppDownloadSettings,
  postAdminAppDownloadApkUpload,
  putAdminAppDownloadSettings,
} from '../controllers/appDownloadController.js';
import { ensureDownloadDirectories } from '../services/appDownloadService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_APK_DIR = path.join(__dirname, '..', 'uploads', 'app-download');

ensureDownloadDirectories();
if (!fs.existsSync(TEMP_APK_DIR)) {
  fs.mkdirSync(TEMP_APK_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TEMP_APK_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '.apk').toLowerCase() || '.apk';
    cb(null, `upload-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext !== '.apk') {
      return cb(new Error('Only APK files are allowed'));
    }
    return cb(null, true);
  },
});

const router = express.Router();
router.use(requireAdminAuth);

router.get('/app-download', getAdminAppDownloadSettings);
router.put('/app-download', putAdminAppDownloadSettings);
router.post('/app-download/apk', upload.single('apk'), postAdminAppDownloadApkUpload);
router.delete('/app-download/apk', deleteAdminAppDownloadApk);

export default router;
