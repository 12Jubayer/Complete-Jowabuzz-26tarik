import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import {
  deleteAdminMoveCashApk,
  getAdminMoveCashSettings,
  postAdminMoveCashApkUpload,
  postAdminMoveCashRegenerateLink,
  putAdminMoveCashExpiry,
} from '../controllers/adminMoveCashController.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APK_DIR = path.join(__dirname, '..', 'uploads', 'movecash');

if (!fs.existsSync(APK_DIR)) {
  fs.mkdirSync(APK_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, APK_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '.apk').toLowerCase() || '.apk';
    cb(null, `movecash${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 120 * 1024 * 1024 },
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

router.get('/', getAdminMoveCashSettings);
router.post('/regenerate-link', postAdminMoveCashRegenerateLink);
router.put('/expiry', putAdminMoveCashExpiry);
router.post('/apk', upload.single('apk'), postAdminMoveCashApkUpload);
router.delete('/apk', deleteAdminMoveCashApk);

export default router;
