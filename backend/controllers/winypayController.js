import {
  processWinypayDepositCallback,
  processWinypayWithdrawCallback,
} from '../services/winypayCallbackService.js';
import { logWinypay, isWinypayConfigured, getWinypayConfig } from '../services/winypayService.js';

function getCallbackSignature(req) {
  return req.headers['x-callback-sign'] || req.headers['X-Callback-Sign'] || '';
}

export async function winypayDepositCallback(req, res) {
  try {
    const rawBody = req.rawBody || '';
    const result = await processWinypayDepositCallback({
      rawBody,
      signature: getCallbackSignature(req),
      parsedBody: req.body,
    });
    return res.status(200).json(result);
  } catch (error) {
    logWinypay('deposit_callback_error', { message: error.message, statusCode: error.statusCode });
    return res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Callback processing failed',
    });
  }
}

export async function winypayWithdrawCallback(req, res) {
  try {
    const rawBody = req.rawBody || '';
    const result = await processWinypayWithdrawCallback({
      rawBody,
      signature: getCallbackSignature(req),
      parsedBody: req.body,
    });
    return res.status(200).json(result);
  } catch (error) {
    logWinypay('withdraw_callback_error', { message: error.message, statusCode: error.statusCode });
    return res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Callback processing failed',
    });
  }
}

export async function winypayStatus(req, res) {
  const config = getWinypayConfig();
  return res.json({
    configured: isWinypayConfigured(),
    merchantCode: config.merchantCode ? `${config.merchantCode.slice(0, 3)}***` : null,
    depositCallbackUrl: config.depositCallbackUrl,
    withdrawCallbackUrl: config.withdrawCallbackUrl,
    jumpUrl: config.jumpUrl,
    currency: config.currency,
  });
}

export default { winypayDepositCallback, winypayWithdrawCallback, winypayStatus };
