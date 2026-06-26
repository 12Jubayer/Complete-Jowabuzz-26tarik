import {
  getAppDownloadSetting,
  getPublicAppDownloadInfo,
  removeAppApkFile,
  saveAppDownloadSetting,
  saveUploadedApk,
} from '../services/appDownloadService.js';

export async function getPublicAppDownload(req, res) {
  try {
    const setting = await getAppDownloadSetting();
    return res.json({
      success: true,
      app: getPublicAppDownloadInfo(setting),
    });
  } catch (error) {
    console.error('Get public app download error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load app download info' });
  }
}

export async function getAdminAppDownloadSettings(req, res) {
  try {
    const setting = await getAppDownloadSetting();
    return res.json({
      success: true,
      settings: setting,
    });
  } catch (error) {
    console.error('Get admin app download settings error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load app download settings' });
  }
}

export async function putAdminAppDownloadSettings(req, res) {
  try {
    const body = req.body || {};
    const setting = await saveAppDownloadSetting({
      version: body.version,
      apkUrl: body.apkUrl ?? body.apk_url,
      appSize: body.appSize ?? body.app_size,
      releaseNotes: body.releaseNotes ?? body.release_notes,
      isActive: body.isActive ?? body.is_active,
    });

    return res.json({
      success: true,
      message: 'App download settings saved',
      settings: setting,
    });
  } catch (error) {
    console.error('Update app download settings error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to save app download settings',
    });
  }
}

export async function postAdminAppDownloadApkUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'APK file is required' });
    }

    const setting = await saveUploadedApk(req.file);
    return res.json({
      success: true,
      message: 'APK uploaded successfully',
      settings: setting,
    });
  } catch (error) {
    console.error('Upload app APK error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to upload APK',
    });
  }
}

export async function deleteAdminAppDownloadApk(req, res) {
  try {
    const setting = await removeAppApkFile();
    return res.json({
      success: true,
      message: 'APK removed',
      settings: setting,
    });
  } catch (error) {
    console.error('Delete app APK error:', error);
    return res.status(500).json({ success: false, error: 'Failed to remove APK' });
  }
}
