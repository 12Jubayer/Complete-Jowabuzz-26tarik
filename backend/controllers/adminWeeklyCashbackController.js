import {
  getWeeklyCashbackSettings,
  listWeeklyCashbackPayouts,
  updateWeeklyCashbackSettings,
} from '../services/weeklyCashbackService.js';

export async function getAdminWeeklyCashback(req, res) {
  try {
    const settings = await getWeeklyCashbackSettings();
    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Get weekly cashback settings error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to load weekly cashback settings',
    });
  }
}

export async function putAdminWeeklyCashback(req, res) {
  try {
    const settings = await updateWeeklyCashbackSettings(req.body || {});
    return res.json({
      success: true,
      settings,
      message: 'Weekly cashback settings saved',
    });
  } catch (error) {
    console.error('Update weekly cashback settings error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to save weekly cashback settings',
    });
  }
}

export async function getAdminWeeklyCashbackPayouts(req, res) {
  try {
    const payouts = await listWeeklyCashbackPayouts({
      limit: req.query.limit,
    });
    return res.json({ success: true, payouts });
  } catch (error) {
    console.error('List weekly cashback payouts error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to load weekly cashback payouts',
    });
  }
}

export default {
  getAdminWeeklyCashback,
  putAdminWeeklyCashback,
  getAdminWeeklyCashbackPayouts,
};
