import {
  cancelAdminBonusProgress,
  getAdminBonusProgressById,
  listAdminBonusProgress,
  resetAdminBonusProgress,
} from '../services/bonusUserProgressService.js';

export async function getAdminBonusProgressList(req, res) {
  try {
    const records = await listAdminBonusProgress({
      status: req.query.status || 'all',
      search: req.query.search || '',
      source: req.query.source || 'all',
    });
    return res.json({ success: true, records });
  } catch (error) {
    console.error('List bonus progress error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load bonus progress',
    });
  }
}

export async function getAdminBonusProgressDetail(req, res) {
  try {
    const id = Number(req.params.id);
    const record = await getAdminBonusProgressById(id);
    return res.json({ success: true, record });
  } catch (error) {
    console.error('Get bonus progress detail error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load bonus progress detail',
    });
  }
}

export async function putAdminBonusProgressCancel(req, res) {
  try {
    const id = Number(req.params.id);
    const record = await cancelAdminBonusProgress(id);
    return res.json({
      success: true,
      record,
      message: 'Bonus cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel bonus progress error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to cancel bonus',
    });
  }
}

export async function putAdminBonusProgressReset(req, res) {
  try {
    const id = Number(req.params.id);
    const record = await resetAdminBonusProgress(id);
    return res.json({
      success: true,
      record,
      message: 'Bonus progress reset successfully',
    });
  } catch (error) {
    console.error('Reset bonus progress error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to reset bonus progress',
    });
  }
}

export default {
  getAdminBonusProgressList,
  getAdminBonusProgressDetail,
  putAdminBonusProgressCancel,
  putAdminBonusProgressReset,
};
