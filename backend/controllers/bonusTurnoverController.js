import {
  createBonusTurnoverRule,
  deleteBonusTurnoverRule,
  listBonusTurnoverRules,
  listActiveBonusTurnoverRules,
  updateBonusTurnoverRule,
} from '../services/bonusTurnoverService.js';

export async function getAdminBonusTurnover(req, res) {
  try {
    const rules = await listBonusTurnoverRules();
    return res.json({ success: true, data: rules });
  } catch (error) {
    console.error('Get admin bonus turnover error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load bonus turnover rules' });
  }
}

export async function postAdminBonusTurnover(req, res) {
  try {
    const rule = await createBonusTurnoverRule(req.body);
    return res.status(201).json({
      success: true,
      message: 'Bonus rule created successfully',
      data: rule,
    });
  } catch (error) {
    console.error('Create admin bonus turnover error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create bonus rule',
    });
  }
}

export async function putAdminBonusTurnover(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: 'Invalid bonus rule id' });
    }

    const rule = await updateBonusTurnoverRule(id, req.body);
    return res.json({
      success: true,
      message: 'Bonus rule saved successfully',
      data: rule,
    });
  } catch (error) {
    console.error('Update admin bonus turnover error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to save bonus rule',
    });
  }
}

export async function deleteAdminBonusTurnover(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: 'Invalid bonus rule id' });
    }

    await deleteBonusTurnoverRule(id);
    return res.json({
      success: true,
      message: 'Bonus rule deleted successfully',
    });
  } catch (error) {
    console.error('Delete admin bonus turnover error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to delete bonus rule',
    });
  }
}

export async function getSiteActiveBonusTurnover(req, res) {
  try {
    const rules = await listActiveBonusTurnoverRules();
    return res.json({ success: true, data: rules });
  } catch (error) {
    console.error('Get site active bonus turnover error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load active bonus offers' });
  }
}

export default getAdminBonusTurnover;
