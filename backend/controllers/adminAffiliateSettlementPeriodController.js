import {
  activateSettlementPeriod,
  createSettlementPeriod,
  getActiveSettlementPeriod,
  listAdminPeriodSettlements,
  listSettlementPeriods,
  runSettlementForActivePeriod,
  updateSettlementPeriod,
} from '../services/affiliateSettlementPeriodService.js';

export async function getSettlementPeriods(req, res) {
  try {
    const periods = await listSettlementPeriods();
    const activePeriod = await getActiveSettlementPeriod();
    return res.json({ periods, activePeriod });
  } catch (error) {
    console.error('Get settlement periods error:', error);
    return res.status(500).json({ error: 'Failed to load settlement periods' });
  }
}

export async function createSettlementPeriodHandler(req, res) {
  try {
    const period = await createSettlementPeriod(req.body);
    return res.status(201).json({ success: true, period });
  } catch (error) {
    console.error('Create settlement period error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to create settlement period',
    });
  }
}

export async function updateSettlementPeriodHandler(req, res) {
  const periodId = Number(req.params.id);

  try {
    await updateSettlementPeriod(periodId, req.body);
    const periods = await listSettlementPeriods();
    const activePeriod = await getActiveSettlementPeriod();
    return res.json({ success: true, periods, activePeriod });
  } catch (error) {
    console.error('Update settlement period error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update settlement period',
    });
  }
}

export async function activateSettlementPeriodHandler(req, res) {
  const periodId = Number(req.params.id);

  try {
    const periods = await activateSettlementPeriod(periodId);
    const activePeriod = await getActiveSettlementPeriod();
    return res.json({ success: true, periods, activePeriod });
  } catch (error) {
    console.error('Activate settlement period error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to activate settlement period',
    });
  }
}

export async function runActivePeriodSettlement(req, res) {
  try {
    const result = await runSettlementForActivePeriod();
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Run active period settlement error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to run settlement',
    });
  }
}

export async function getPeriodSettlements(req, res) {
  try {
    const settlements = await listAdminPeriodSettlements();
    return res.json({ settlements });
  } catch (error) {
    console.error('Get period settlements error:', error);
    return res.status(500).json({ error: 'Failed to load settlements' });
  }
}
