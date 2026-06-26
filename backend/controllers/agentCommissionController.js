import {
  exportAgentCommissionCsv,
  exportAgentCommissionPdf,
  getAgentCommissionSummary,
  getCommissionSettings,
  listAgentCommissionAgents,
  listAgentCommissionTransactions,
  listAgentOwnCommissions,
  updateCommissionSettings,
} from '../services/agentCommissionService.js';
import {
  approveAgentCommissionSettlement,
  generateAgentCommissionSettlements,
  getAgentCommissionSettlementDetails,
  listAdminAgentCommissionSettlements,
  listAgentCommissionSettlements,
  rejectAgentCommissionSettlement,
} from '../services/agentCommissionSettlementService.js';

function getAdminId(req) {
  return Number(req.admin?.sub);
}

export async function getAdminAgentCommissionSummary(req, res) {
  try {
    const summary = await getAgentCommissionSummary();
    return res.json({ success: true, summary });
  } catch (error) {
    console.error('Agent commission summary error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load summary',
    });
  }
}

export async function getAdminAgentCommissionAgents(req, res) {
  try {
    const agents = await listAgentCommissionAgents({ search: req.query.search });
    return res.json({ success: true, agents });
  } catch (error) {
    console.error('Agent commission agents error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load agents',
    });
  }
}

export async function getAdminAgentCommissionTransactions(req, res) {
  try {
    const transactions = await listAgentCommissionTransactions({
      search: req.query.search,
      type: req.query.type || 'all',
    });
    return res.json({ success: true, transactions });
  } catch (error) {
    console.error('Agent commission transactions error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load transactions',
    });
  }
}

export async function getAdminAgentCommissionSettings(req, res) {
  try {
    const settings = await getCommissionSettings();
    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Agent commission settings error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load settings',
    });
  }
}

export async function putAdminAgentCommissionSettings(req, res) {
  try {
    const settings = await updateCommissionSettings(req.body || {});
    return res.json({
      success: true,
      settings,
      message: 'Commission rates saved',
    });
  } catch (error) {
    console.error('Update agent commission settings error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to save settings',
    });
  }
}

export async function getAdminAgentCommissionExportCsv(req, res) {
  try {
    const { filename, content } = await exportAgentCommissionCsv({
      tab: req.query.tab || 'agents',
      search: req.query.search,
      type: req.query.type || 'all',
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(content);
  } catch (error) {
    console.error('Agent commission CSV export error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to export CSV',
    });
  }
}

export async function getAdminAgentCommissionExportPdf(req, res) {
  try {
    const { filename, content } = await exportAgentCommissionPdf({
      tab: req.query.tab || 'agents',
      search: req.query.search,
      type: req.query.type || 'all',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(content);
  } catch (error) {
    console.error('Agent commission PDF export error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to export PDF',
    });
  }
}

export async function getAgentCommissions(req, res) {
  try {
    const agentId = Number(req.agent?.sub);
    const data = await listAgentOwnCommissions(agentId, { limit: req.query.limit });
    return res.json({ success: true, ...data });
  } catch (error) {
    console.error('Agent commissions error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load commissions',
    });
  }
}

export async function getAdminAgentCommissionSettlements(req, res) {
  try {
    const settlements = await listAdminAgentCommissionSettlements({
      status: req.query.status || 'all',
      search: req.query.search || '',
    });
    return res.json({ success: true, settlements });
  } catch (error) {
    console.error('List agent commission settlements error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load settlements',
    });
  }
}

export async function getAdminAgentCommissionSettlementDetails(req, res) {
  try {
    const data = await getAgentCommissionSettlementDetails(Number(req.params.id));
    return res.json({ success: true, ...data });
  } catch (error) {
    console.error('Agent commission settlement details error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load settlement details',
    });
  }
}

export async function postAdminAgentCommissionSettlementsGenerate(req, res) {
  try {
    const result = await generateAgentCommissionSettlements({
      periodStart: req.body?.periodStart,
      periodEnd: req.body?.periodEnd,
      mode: req.body?.mode || 'open',
      force: Boolean(req.body?.force),
    });
    return res.json({
      success: true,
      ...result,
      message: `Generated ${result.created} settlement(s) for ${result.periodLabel}`,
    });
  } catch (error) {
    console.error('Generate agent commission settlements error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to generate settlements',
    });
  }
}

export async function postAdminAgentCommissionSettlementApprove(req, res) {
  try {
    const settlement = await approveAgentCommissionSettlement(
      Number(req.params.id),
      getAdminId(req),
    );
    return res.json({
      success: true,
      settlement,
      message: 'Settlement approved and credited to agent balance',
    });
  } catch (error) {
    console.error('Approve agent commission settlement error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to approve settlement',
    });
  }
}

export async function postAdminAgentCommissionSettlementReject(req, res) {
  try {
    const settlement = await rejectAgentCommissionSettlement(
      Number(req.params.id),
      getAdminId(req),
    );
    return res.json({
      success: true,
      settlement,
      message: 'Settlement rejected',
    });
  } catch (error) {
    console.error('Reject agent commission settlement error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to reject settlement',
    });
  }
}

export async function getAgentCommissionSettlements(req, res) {
  try {
    const agentId = Number(req.agent?.sub);
    const data = await listAgentCommissionSettlements(agentId);
    return res.json({ success: true, ...data });
  } catch (error) {
    console.error('Agent commission settlements error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load settlements',
    });
  }
}

export default {
  getAdminAgentCommissionSummary,
  getAdminAgentCommissionAgents,
  getAdminAgentCommissionTransactions,
  getAdminAgentCommissionSettings,
  putAdminAgentCommissionSettings,
  getAdminAgentCommissionExportCsv,
  getAdminAgentCommissionExportPdf,
  getAgentCommissions,
  getAdminAgentCommissionSettlements,
  getAdminAgentCommissionSettlementDetails,
  postAdminAgentCommissionSettlementsGenerate,
  postAdminAgentCommissionSettlementApprove,
  postAdminAgentCommissionSettlementReject,
  getAgentCommissionSettlements,
};
