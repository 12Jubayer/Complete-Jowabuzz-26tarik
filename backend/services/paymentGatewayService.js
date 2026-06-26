import { getActivePaymentGatewayConfig } from './paymentGatewayConfig.js';
import {
  initiateWinypayDeposit,
  initiateWinypayWithdraw,
  isWinypayConfigured,
} from './winypayService.js';

export { getActivePaymentGatewayConfig };

export async function createDepositIntent({ userId, amount, method, channel, transactionId }) {
  const config = await getActivePaymentGatewayConfig();
  const provider = config.provider || 'manual';

  if (provider === 'manual') {
    return {
      mode: 'manual',
      provider,
      success: true,
      message: 'Manual deposit request flow',
    };
  }

  if (provider === 'winypay') {
    if (!isWinypayConfigured()) {
      const error = new Error('WinyPay gateway is not configured on the server');
      error.statusCode = 503;
      throw error;
    }
    if (!transactionId) {
      const error = new Error('transactionId is required for WinyPay deposit');
      error.statusCode = 500;
      throw error;
    }
    return initiateWinypayDeposit({ userId, amount, method, transactionId });
  }

  if (!config.apiKey) {
    const error = new Error('Payment gateway API key is not configured');
    error.statusCode = 503;
    throw error;
  }

  const liveMode = process.env.PAYMENT_GATEWAY_MODE === 'live';

  if (!liveMode) {
    return {
      mode: 'sandbox',
      provider,
      success: true,
      reference: `${provider}_dep_${userId}_${Date.now()}`,
      message: `${provider} deposit intent created (sandbox)`,
    };
  }

  const error = new Error(`${provider} live gateway is not configured on the server`);
  error.statusCode = 503;
  throw error;
}

export async function createWithdrawPayout({
  userId,
  amount,
  method,
  accountNumber,
  accountName,
  transactionId,
}) {
  const config = await getActivePaymentGatewayConfig();
  const provider = config.provider || 'manual';

  if (provider === 'manual') {
    return {
      mode: 'manual',
      provider,
      success: true,
      message: 'Manual withdraw request flow',
    };
  }

  if (provider === 'winypay') {
    if (!isWinypayConfigured()) {
      const error = new Error('WinyPay gateway is not configured on the server');
      error.statusCode = 503;
      throw error;
    }
    if (!transactionId) {
      const error = new Error('transactionId is required for WinyPay withdrawal');
      error.statusCode = 500;
      throw error;
    }
    return initiateWinypayWithdraw({
      userId,
      amount,
      method,
      accountNumber,
      accountName,
      transactionId,
    });
  }

  if (!config.apiKey) {
    const error = new Error('Payment gateway API key is not configured');
    error.statusCode = 503;
    throw error;
  }

  const liveMode = process.env.PAYMENT_GATEWAY_MODE === 'live';

  if (!liveMode) {
    return {
      mode: 'sandbox',
      provider,
      success: true,
      reference: `${provider}_wd_${userId}_${Date.now()}`,
      message: `${provider} withdraw payout created (sandbox)`,
    };
  }

  const error = new Error(`${provider} live gateway is not configured on the server`);
  error.statusCode = 503;
  throw error;
}

export default { getActivePaymentGatewayConfig, createDepositIntent, createWithdrawPayout };
