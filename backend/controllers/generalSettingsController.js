import {
  getAllGeneralSettings,
  getGeneralChatSettings,
  getGeneralDepositWithdrawSettings,
  getGeneralPaymentGatewaySettings,
  getGeneralSettingsSection,
  updateGeneralSettingsSection,
} from '../services/generalSettingsService.js';

export async function getAdminGeneralSettings(req, res) {
  try {
    const settings = await getAllGeneralSettings();
    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Get general settings error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load general settings',
    });
  }
}

export async function getAdminGeneralSettingsSection(req, res) {
  try {
    const section = String(req.params.section || '').trim();
    const data = await getGeneralSettingsSection(section);
    return res.json({ success: true, section, data });
  } catch (error) {
    console.error('Get general settings section error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load settings section',
    });
  }
}

export async function putAdminGeneralSettingsSection(req, res) {
  try {
    const section = String(req.params.section || '').trim();
    const data = await updateGeneralSettingsSection(section, req.body || {});
    return res.json({
      success: true,
      section,
      data,
      message: 'Settings saved successfully',
    });
  } catch (error) {
    console.error('Update general settings section error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to save settings',
    });
  }
}

export async function getPublicGeneralChatSettings(req, res) {
  try {
    const chat = await getGeneralChatSettings();
    return res.json(chat);
  } catch (error) {
    console.error('Get public chat settings error:', error);
    return res.status(500).json({ error: 'Failed to load chat settings' });
  }
}

export async function getPublicGeneralDepositWithdrawSettings(req, res) {
  try {
    const rules = await getGeneralDepositWithdrawSettings();
    return res.json(rules);
  } catch (error) {
    console.error('Get public deposit withdraw rules error:', error);
    return res.status(500).json({ error: 'Failed to load deposit and withdraw rules' });
  }
}

export async function getPublicGeneralPaymentGatewaySettings(req, res) {
  try {
    const gateway = await getGeneralPaymentGatewaySettings();
    return res.json({
      provider: gateway.provider,
      configured: Boolean(gateway.apiKey) || gateway.provider === 'manual',
    });
  } catch (error) {
    console.error('Get public payment gateway settings error:', error);
    return res.status(500).json({ error: 'Failed to load payment gateway settings' });
  }
}

export default {
  getAdminGeneralSettings,
  getAdminGeneralSettingsSection,
  putAdminGeneralSettingsSection,
  getPublicGeneralChatSettings,
  getPublicGeneralDepositWithdrawSettings,
  getPublicGeneralPaymentGatewaySettings,
};
