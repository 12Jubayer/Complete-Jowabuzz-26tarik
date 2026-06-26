import {
  createCommissionPeriod,
  listCommissionPeriods,
  updateCommissionPeriod,
} from '../services/affiliateCommissionPeriodService.js';

export async function getCommissionPeriods(req, res) {
  try {
    const periods = await listCommissionPeriods();
    return res.json({ periods });
  } catch (error) {
    console.error('Get commission periods error:', error);
    return res.status(500).json({ error: 'Failed to load commission periods' });
  }
}

export async function createCommissionPeriodHandler(req, res) {
  try {
    const period = await createCommissionPeriod(req.body);
    return res.status(201).json({ success: true, period });
  } catch (error) {
    console.error('Create commission period error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to create commission period',
    });
  }
}

export async function updateCommissionPeriodHandler(req, res) {
  const periodId = Number(req.params.id);

  try {
    const periods = await updateCommissionPeriod(periodId, req.body);
    return res.json({ success: true, periods });
  } catch (error) {
    console.error('Update commission period error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update commission period',
    });
  }
}
