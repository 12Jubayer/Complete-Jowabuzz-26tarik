import {
  cancelDepositBonusAccount,
  createDepositBonusRule,
  deleteDepositBonusRule,
  getUserDepositBonusStatus,
  listActiveDepositBonusRules,
  listDepositBonusRules,
  listDepositBonusUserAccounts,
  updateDepositBonusRule,
} from '../services/depositBonusService.js';

export async function getAdminDepositBonusRules(req, res) {
  try {
    const result = await listDepositBonusRules();
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Get deposit bonus rules error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load deposit bonus rules',
    });
  }
}

export async function postAdminDepositBonusRule(req, res) {
  try {
    const rule = await createDepositBonusRule(req.body || {});
    return res.status(201).json({
      success: true,
      rule,
      message: 'Deposit bonus rule created',
    });
  } catch (error) {
    console.error('Create deposit bonus rule error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create deposit bonus rule',
    });
  }
}

export async function putAdminDepositBonusRule(req, res) {
  try {
    const id = Number(req.params.id);
    const rule = await updateDepositBonusRule(id, req.body || {});
    return res.json({
      success: true,
      rule,
      message: 'Deposit bonus rule updated',
    });
  } catch (error) {
    console.error('Update deposit bonus rule error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update deposit bonus rule',
    });
  }
}

export async function deleteAdminDepositBonusRule(req, res) {
  try {
    const id = Number(req.params.id);
    await deleteDepositBonusRule(id);
    return res.json({
      success: true,
      message: 'Deposit bonus rule deleted',
    });
  } catch (error) {
    console.error('Delete deposit bonus rule error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to delete deposit bonus rule',
    });
  }
}

export async function getAdminDepositBonusUsers(req, res) {
  try {
    const accounts = await listDepositBonusUserAccounts({
      status: req.query.status || 'all',
      search: req.query.search || '',
    });
    return res.json({ success: true, accounts });
  } catch (error) {
    console.error('Get deposit bonus users error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load bonus accounts',
    });
  }
}

export async function putAdminDepositBonusUserCancel(req, res) {
  try {
    const id = Number(req.params.id);
    await cancelDepositBonusAccount(id);
    return res.json({
      success: true,
      message: 'Bonus account cancelled',
    });
  } catch (error) {
    console.error('Cancel deposit bonus account error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to cancel bonus account',
    });
  }
}

export async function getSiteActiveDepositBonusRules(req, res) {
  try {
    const rules = await listActiveDepositBonusRules();
    return res.json({ success: true, rules });
  } catch (error) {
    console.error('Get active deposit bonus rules error:', error);
    return res.status(500).json({ error: 'Failed to load deposit bonus offers' });
  }
}

export async function getUserBonusStatus(req, res) {
  try {
    const userId = Number(req.user?.sub);
    const status = await getUserDepositBonusStatus(userId);
    return res.json({ success: true, ...status });
  } catch (error) {
    console.error('Get user bonus status error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load bonus status',
    });
  }
}

export default {
  getAdminDepositBonusRules,
  postAdminDepositBonusRule,
  putAdminDepositBonusRule,
  deleteAdminDepositBonusRule,
  getAdminDepositBonusUsers,
  putAdminDepositBonusUserCancel,
  getSiteActiveDepositBonusRules,
  getUserBonusStatus,
};
