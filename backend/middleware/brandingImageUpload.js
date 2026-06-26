import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'branding');
const MAX_FILE_SIZE = 2 * 1024 * 1024;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function createBrandingUpload({ allowedMimeTypes, allowedExtensions, prefix }) {
  const storage = multer.diskStorage({
    destination(req, file, cb) {
      cb(null, UPLOAD_DIR);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = allowedExtensions.has(ext) ? ext : '.png';
      cb(null, `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    fileFilter(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(ext)) {
        cb(new Error('Invalid image type'));
        return;
      }
      cb(null, true);
    },
  });
}

export const logoUpload = createBrandingUpload({
  prefix: 'logo',
  allowedMimeTypes: new Set(['image/jpeg', 'image/png', 'image/webp']),
  allowedExtensions: new Set(['.jpg', '.jpeg', '.png', '.webp']),
});

export const faviconUpload = createBrandingUpload({
  prefix: 'favicon',
  allowedMimeTypes: new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/x-icon',
    'image/vnd.microsoft.icon',
  ]),
  allowedExtensions: new Set(['.jpg', '.jpeg', '.png', '.webp', '.ico']),
});

export function getBrandingUploadDir() {
  return UPLOAD_DIR;
}

export default logoUpload;
