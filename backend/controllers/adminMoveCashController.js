import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildMoveCashDownloadUrl,
  ensureActiveMoveCashLink,
  getActiveMoveCashLink,
  getMoveCashApkInfo,
  regenerateMoveCashLink,
  removeMoveCashApkInfo,
  saveMoveCashApkInfo,
  updateMoveCashLinkExpiry,
} from '../services/movecashLinkService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APK_DIR = path.join(__dirname, '..', 'uploads', 'movecash');

function parseExpiryInput(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error('Invalid expiry date');
    error.statusCode = 400;
    throw error;
  }
  return date;
}

export async function getAdminMoveCashSettings(req, res) {
  try {
    let link = await getActiveMoveCashLink();
    if (!link) {
      link = await ensureActiveMoveCashLink({ adminId: Number(req.admin?.sub) || null });
    }

    const apk = await getMoveCashApkInfo();

    return res.json({
      success: true,
      settings: {
        appName: 'JBCash',
        link: {
          ...link,
          downloadUrl: buildMoveCashDownloadUrl(link.token, req),
          status: 'active',
        },
        apk,
        instructions: [
          'Share the private download link only via Telegram or direct message.',
          'Do not publish this link on the public website.',
          'Agents install JBCash and login with existing agent credentials.',
        ],
      },
    });
  } catch (error) {
    console.error('Get admin MoveCash settings error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load JBCash settings' });
  }
}

export async function postAdminMoveCashRegenerateLink(req, res) {
  try {
    const expiresAt = parseExpiryInput(req.body?.expiresAt ?? req.body?.expires_at);
    const link = await regenerateMoveCashLink({
      adminId: Number(req.admin?.sub) || null,
      expiresAt,
    });

    return res.json({
      success: true,
      message: 'MoveCash download link regenerated',
      link: {
        ...link,
        downloadUrl: buildMoveCashDownloadUrl(link.token, req),
      },
    });
  } catch (error) {
    console.error('Regenerate MoveCash link error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to regenerate link',
    });
  }
}

export async function putAdminMoveCashExpiry(req, res) {
  try {
    const expiresAt = parseExpiryInput(req.body?.expiresAt ?? req.body?.expires_at);
    const link = await updateMoveCashLinkExpiry({ expiresAt });
    return res.json({
      success: true,
      message: 'Expiry updated',
      link: {
        ...link,
        downloadUrl: buildMoveCashDownloadUrl(link.token, req),
      },
    });
  } catch (error) {
    console.error('Update MoveCash expiry error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update expiry',
    });
  }
}

export async function postAdminMoveCashApkUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'APK file is required' });
    }

    const url = `/uploads/movecash/${req.file.filename}`;
    const apk = await saveMoveCashApkInfo({ url, filename: req.file.originalname || req.file.filename });

    return res.json({
      success: true,
      message: 'APK uploaded',
      apk,
    });
  } catch (error) {
    console.error('Upload MoveCash APK error:', error);
    return res.status(500).json({ success: false, error: 'Failed to upload APK' });
  }
}

export async function deleteAdminMoveCashApk(req, res) {
  try {
    const apk = await getMoveCashApkInfo();
    if (apk?.url) {
      const filename = path.basename(apk.url);
      const filePath = path.join(APK_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    const cleared = await removeMoveCashApkInfo();
    return res.json({ success: true, message: 'APK removed', apk: cleared });
  } catch (error) {
    console.error('Delete MoveCash APK error:', error);
    return res.status(500).json({ success: false, error: 'Failed to remove APK' });
  }
}
