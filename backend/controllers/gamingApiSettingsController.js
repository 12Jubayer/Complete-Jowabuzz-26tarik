import {
  exportGamingTransactionsCsv,
  exportGamingTransactionsPdf,
  getGamingGatewaySettingsForAdmin,
  listGamingTransactions,
  isOracleBalanceInquiryBetType,
  processOracleCallback,
  processOracleRefund,
  setGamingGatewayStatus,
  testGamingGameLaunch,
  testGamingGatewayConnection,
  updateGamingGatewaySettings,
  getPublicGamingGatewayStatus,
} from '../services/gamingGatewayService.js';
import {
  formatGetBalanceProbeResponse,
  logOracleCallbackRequest,
  mergeOracleCallbackPayload,
  shouldFormatGetBalanceProbeResponse,
} from '../utils/oracleCallbackRequestDebug.js';

function normalizeIncomingBetType(payload = {}) {
  const betType = String(
    payload.bet_type ??
    payload.betType ??
    payload.type ??
    payload.action ??
    payload.method ??
    '',
  )
    .trim()
    .toUpperCase();
  if (['GETBALANCE', 'GET_BALANCE', 'BALANCE', 'BALANCE_INQUIRY', 'CHECK_BALANCE'].includes(betType)) {
    return 'BALANCE';
  }
  if (['WIN', 'CREDIT', 'PAYOUT', 'PRIZE'].includes(betType)) return 'SETTLE';
  if (['DEBIT', 'WAGER', 'STAKE'].includes(betType)) return 'BET';
  if (['CANCEL_BET', 'UNDO'].includes(betType)) return 'ROLLBACK';
  return betType;
}

export async function getAdminGamingApiSettings(req, res) {
  try {
    const settings = await getGamingGatewaySettingsForAdmin();
    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Get gaming API settings error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load gaming API settings',
    });
  }
}

export async function putAdminGamingApiSettings(req, res) {
  try {
    const settings = await updateGamingGatewaySettings(req.body || {});
    return res.json({
      success: true,
      settings,
      message: 'Gaming gateway configuration saved successfully',
    });
  } catch (error) {
    console.error('Update gaming API settings error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to save gaming API settings',
    });
  }
}

export async function postAdminGamingApiSettingsTestConnection(req, res) {
  try {
    const result = await testGamingGatewayConnection();
    return res.json({ success: result.success, result, message: result.message });
  } catch (error) {
    console.error('Test gaming API connection error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Connection test failed',
    });
  }
}

export async function postAdminGamingApiSettingsTestGameLaunch(req, res) {
  try {
    const result = await testGamingGameLaunch(req.body || {});
    return res.json({ success: result.success, result, message: result.message });
  } catch (error) {
    console.error('Test game launch error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Game launch test failed',
    });
  }
}

export async function postAdminGamingApiSettingsEnable(req, res) {
  try {
    const settings = await setGamingGatewayStatus('active');
    return res.json({ success: true, settings, message: 'Provider enabled' });
  } catch (error) {
    console.error('Enable gaming provider error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to enable provider',
    });
  }
}

export async function postAdminGamingApiSettingsDisable(req, res) {
  try {
    const settings = await setGamingGatewayStatus('inactive');
    return res.json({ success: true, settings, message: 'Provider disabled' });
  } catch (error) {
    console.error('Disable gaming provider error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to disable provider',
    });
  }
}

export async function getAdminGamingTransactions(req, res) {
  try {
    const transactions = await listGamingTransactions({
      search: req.query.search,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    return res.json({ success: true, transactions });
  } catch (error) {
    console.error('List gaming transactions error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to load gaming transactions',
    });
  }
}

export async function getAdminGamingTransactionsExportCsv(req, res) {
  try {
    const payload = await exportGamingTransactionsCsv({
      search: req.query.search,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${payload.filename}"`);
    return res.send(payload.content);
  } catch (error) {
    console.error('Export gaming CSV error:', error);
    return res.status(500).json({ error: 'Failed to export gaming transactions' });
  }
}

export async function getAdminGamingTransactionsExportPdf(req, res) {
  try {
    const payload = await exportGamingTransactionsPdf({
      search: req.query.search,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${payload.filename}"`);
    return res.send(payload.content);
  } catch (error) {
    console.error('Export gaming PDF error:', error);
    return res.status(500).json({ error: 'Failed to export gaming transactions' });
  }
}

export async function getPublicGamingGatewaySettings(req, res) {
  try {
    const status = await getPublicGamingGatewayStatus();
    return res.json(status);
  } catch (error) {
    console.error('Get public gaming gateway status error:', error);
    return res.status(500).json({ error: 'Failed to load gaming gateway status' });
  }
}

export async function postOracleCallback(req, res) {

  console.log('[ORACLE_CALLBACK_DEBUG] Received request :>', {
    method: req.method,
    url: req.url,
    body: req.body,
    headers: req.headers,
  });

  const rawBody = mergeOracleCallbackPayload(req);
  const betType = normalizeIncomingBetType(rawBody);
  const balanceInquiry = isOracleBalanceInquiryBetType(betType);
  const useGetBalanceProbeResponse = shouldFormatGetBalanceProbeResponse(req, betType);

  logOracleCallbackRequest(req, rawBody, betType);

  try {
    const result = await processOracleCallback(rawBody);

    console.log('[ORACLE_CALLBACK_DEBUG]', JSON.stringify({
      phase: 'response',
      requestMethod: req.method,
      actionType: balanceInquiry ? 'BALANCE' : betType,
      userPlayerId:
        result.username ??
        rawBody.username ??
        rawBody.user_name ??
        rawBody.member_id ??
        null,
      responseBody: useGetBalanceProbeResponse
        ? formatGetBalanceProbeResponse(result)
        : result,
    }));

    if (useGetBalanceProbeResponse) {
      return res.json(formatGetBalanceProbeResponse(result));
    }

    return res.json(result);
  } catch (error) {
    console.error('[ORACLE_CALLBACK_DEBUG]', JSON.stringify({
      phase: 'error',
      requestMethod: req.method,
      actionType: balanceInquiry ? 'BALANCE' : betType,
      message: error.message,
      statusCode: error.statusCode || 500,
    }));

    const statusCode = error.statusCode || 500;

    if (useGetBalanceProbeResponse) {
      return res.status(statusCode).json({
        status: 'error',
        balance: 0,
      });
    }

    return res.status(statusCode).json({
      success: false,
      status: false,
      error: error.message || 'Callback processing failed',
      errorCode: statusCode === 404 ? 1 : statusCode === 400 ? 2 : statusCode === 401 ? 3 : 7,
      errorMessage: error.message || 'Callback processing failed',
      balance: 0,
      money: 0,
    });
  }
}

export async function postOracleRefund(req, res) {
  try {
    const result = await processOracleRefund(req.body || {});
    return res.json(result);
  } catch (error) {
    console.error('Oracle refund error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Refund processing failed',
    });
  }
}

export default {
  getAdminGamingApiSettings,
  putAdminGamingApiSettings,
  postAdminGamingApiSettingsTestConnection,
  postAdminGamingApiSettingsTestGameLaunch,
  postAdminGamingApiSettingsEnable,
  postAdminGamingApiSettingsDisable,
  getAdminGamingTransactions,
  getAdminGamingTransactionsExportCsv,
  getAdminGamingTransactionsExportPdf,
  getPublicGamingGatewaySettings,
  postOracleCallback,
  postOracleRefund,
};
