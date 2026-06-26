import {
  getSmsSettingsInternal,
  isSmsProviderActive,
  sendBulkPromotionalSms,
  sendOtpMessage,
  sendPromotionalMessage,
  sendSmsMessage,
} from './smsApiSettingsService.js';

export async function sendOtpSms({ mobile, otp, purpose = 'withdraw', amount, minutes = 5 }) {
  const settings = await getSmsSettingsInternal();

  if (!settings.isActive && settings.apiMode === 'production') {
    return {
      sent: false,
      demo: false,
      message: 'SMS provider is disabled',
    };
  }

  try {
    const result = await sendOtpMessage({
      mobile,
      otp,
      purpose,
      amount,
      minutes,
    });

    return {
      sent: true,
      demo: Boolean(result.demo),
      message: result.message,
      provider: settings.providerName,
      recipient: result.recipient,
    };
  } catch (error) {
    console.error('sendOtpSms error:', error.message);
    return {
      sent: false,
      demo: false,
      message: error.message || 'Failed to send OTP SMS',
    };
  }
}

export async function sendTransactionalSms({ mobile, message, purpose = 'transactional' }) {
  const settings = await getSmsSettingsInternal();

  if (!settings.isActive && settings.apiMode === 'production') {
    return { sent: false, message: 'SMS provider is disabled' };
  }

  try {
    const result = await sendSmsMessage({ mobile, message, purpose, smsType: 'transactional' });
    return { sent: true, demo: Boolean(result.demo), message: result.message };
  } catch (error) {
    console.error('sendTransactionalSms error:', error.message);
    return { sent: false, message: error.message || 'Failed to send SMS' };
  }
}

export async function sendDepositApprovedSms({ mobile, amount, currency = 'BDT' }) {
  const message = `Your deposit of ৳${Number(amount || 0).toFixed(2)} has been approved. Thank you for using JowaBuzz.`;
  return sendTransactionalSms({ mobile, message, purpose: 'deposit_approved' });
}

export async function sendWithdrawApprovedSms({ mobile, amount, currency = 'BDT' }) {
  const message = `Your withdrawal of ৳${Number(amount || 0).toFixed(2)} has been approved and processed.`;
  return sendTransactionalSms({ mobile, message, purpose: 'withdraw_approved' });
}

export { sendBulkPromotionalSms, sendPromotionalMessage, isSmsProviderActive };

export default sendOtpSms;
