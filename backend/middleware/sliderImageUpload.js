import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'sliders');
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
    cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
    return;
  }

  cb(null, true);
}

export const sliderImageUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

export function getSliderUploadDir() {
  return UPLOAD_DIR;
}

export function resolveManagedSliderImagePath(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;

  const trimmed = imageUrl.trim();
  if (!trimmed.startsWith('/uploads/sliders/')) return null;

  const filename = path.basename(trimmed);
  if (!filename || filename.includes('..')) return null;

  const fullPath = path.join(UPLOAD_DIR, filename);
  const normalizedUploadDir = path.resolve(UPLOAD_DIR);
  const normalizedFullPath = path.resolve(fullPath);

  if (!normalizedFullPath.startsWith(`${normalizedUploadDir}${path.sep}`)) {
    return null;
  }

  return normalizedFullPath;
}

export function deleteManagedSliderImage(imageUrl) {
  const filePath = resolveManagedSliderImagePath(imageUrl);
  if (!filePath) return false;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.warn('Failed to delete slider image:', imageUrl, error.message);
  }

  return false;
}

export default sliderImageUpload;
