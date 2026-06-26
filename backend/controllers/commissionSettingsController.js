import {
  approveCommissionRecord,
  exportCommissionRecordsCsv,
  exportCommissionRecordsPdf,
  getCommissionSettings,
  listCommissionRecords,
  rejectCommissionRecord,
  resetCommissionSettings,
  updateCommissionSettings,
} from '../services/commissionSettingsService.js';

export async function getAdminCommissionSettings(req, res) {
  try {
    const settings = await getCommissionSettings();
    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Get commission settings error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load commission settings',
    });
  }
}

export async function putAdminCommissionSettings(req, res) {
  try {
    const settings = await updateCommissionSettings(req.body || {});
    return res.json({
      success: true,
      settings,
      message: 'Commission settings saved successfully',
    });
  } catch (error) {
    console.error('Update commission settings error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to save commission settings',
    });
  }
}

export async function postAdminCommissionSettingsReset(req, res) {
  try {
    const settings = await resetCommissionSettings();
    return res.json({
      success: true,
      settings,
      message: 'Commission settings reset to defaults',
    });
  } catch (error) {
    console.error('Reset commission settings error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to reset commission settings',
    });
  }
}

export async function getAdminCommissionRecords(req, res) {
  try {
    const records = await listCommissionRecords({
      status: req.query.status,
      role: req.query.role,
      search: req.query.search,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    return res.json({ success: true, records });
  } catch (error) {
    console.error('List commission records error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load commission records',
    });
  }
}

export async function postAdminCommissionRecordApprove(req, res) {
  try {
    const source = String(req.params.source || '').trim();
    const recordId = Number(req.params.id);
    const adminId = req.admin?.id || req.admin?.adminId || null;
    const result = await approveCommissionRecord(source, recordId, adminId);
    return res.json(result);
  } catch (error) {
    console.error('Approve commission record error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to approve commission',
    });
  }
}

export async function postAdminCommissionRecordReject(req, res) {
  try {
    const source = String(req.params.source || '').trim();
    const recordId = Number(req.params.id);
    const result = await rejectCommissionRecord(source, recordId);
    return res.json(result);
  } catch (error) {
    console.error('Reject commission record error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to reject commission',
    });
  }
}

export async function getAdminCommissionRecordsExportCsv(req, res) {
  try {
    const payload = await exportCommissionRecordsCsv({
      status: req.query.status,
      role: req.query.role,
      search: req.query.search,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${payload.filename}"`);
    return res.send(payload.content);
  } catch (error) {
    console.error('Export commission CSV error:', error);
    return res.status(500).json({ error: 'Failed to export commission records' });
  }
}

export async function getAdminCommissionRecordsExportPdf(req, res) {
  try {
    const payload = await exportCommissionRecordsPdf({
      status: req.query.status,
      role: req.query.role,
      search: req.query.search,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${payload.filename}"`);
    return res.send(payload.content);
  } catch (error) {
    console.error('Export commission PDF error:', error);
    return res.status(500).json({ error: 'Failed to export commission records' });
  }
}

export default {
  getAdminCommissionSettings,
  putAdminCommissionSettings,
  postAdminCommissionSettingsReset,
  getAdminCommissionRecords,
  postAdminCommissionRecordApprove,
  postAdminCommissionRecordReject,
  getAdminCommissionRecordsExportCsv,
  getAdminCommissionRecordsExportPdf,
};
