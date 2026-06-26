import {
  getSmsSettingsForAdmin,
  listSmsLogs,
  sendBulkPromotionalSms,
  setSmsProviderStatus,
  testSmsConnection,
  updateSmsSettings,
} from '../services/smsApiSettingsService.js';

export async function getAdminSmsSettings(req, res) {
  try {
    const settings = await getSmsSettingsForAdmin();
    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Get SMS settings error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load SMS settings',
    });
  }
}

export async function putAdminSmsSettings(req, res) {
  try {
    const settings = await updateSmsSettings(req.body || {});
    return res.json({
      success: true,
      settings,
      message: 'SMS configuration saved successfully',
    });
  } catch (error) {
    console.error('Update SMS settings error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to save SMS settings',
    });
  }
}

export async function postAdminSmsSettingsTest(req, res) {
  try {
    const result = await testSmsConnection(req.body || {});
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Test SMS error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Test SMS failed',
    });
  }
}

export async function postAdminSmsSettingsEnable(req, res) {
  try {
    const settings = await setSmsProviderStatus(true);
    return res.json({ success: true, settings, message: 'SMS provider enabled' });
  } catch (error) {
    console.error('Enable SMS provider error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to enable SMS provider',
    });
  }
}

export async function postAdminSmsSettingsDisable(req, res) {
  try {
    const settings = await setSmsProviderStatus(false);
    return res.json({ success: true, settings, message: 'SMS provider disabled' });
  } catch (error) {
    console.error('Disable SMS provider error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to disable SMS provider',
    });
  }
}

export async function getAdminSmsLogs(req, res) {
  try {
    const logs = await listSmsLogs({ search: req.query.search, limit: req.query.limit });
    return res.json({ success: true, logs });
  } catch (error) {
    console.error('List SMS logs error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load SMS logs',
    });
  }
}

export async function postAdminSmsBulkSend(req, res) {
  try {
    const mobiles = req.body?.mobiles || req.body?.recipients || [];
    const message = req.body?.message || '';
    const result = await sendBulkPromotionalSms({ mobiles, message });
    return res.json({
      success: true,
      message: `Bulk SMS completed: ${result.sent}/${result.total} sent`,
      result,
    });
  } catch (error) {
    console.error('Bulk SMS error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Bulk SMS failed',
    });
  }
}

export default {
  getAdminSmsSettings,
  putAdminSmsSettings,
  postAdminSmsSettingsTest,
  postAdminSmsSettingsEnable,
  postAdminSmsSettingsDisable,
  getAdminSmsLogs,
  postAdminSmsBulkSend,
};
