import { getGeneralPaymentGatewaySettings } from './generalSettingsService.js';

function trim(value) {
  return String(value ?? '').trim();
}

const ALLOWED_ENV_PROVIDERS = ['manual', 'winypay', 'sslcommerz', 'aamarpay', 'shurjopay'];

export async function getActivePaymentGatewayConfig() {
  const settings = await getGeneralPaymentGatewaySettings();
  const envProvider = trim(process.env.PAYMENT_GATEWAY_PROVIDER).toLowerCase();
  if (envProvider && ALLOWED_ENV_PROVIDERS.includes(envProvider)) {
    return { ...settings, provider: envProvider };
  }
  return settings;
}

export default { getActivePaymentGatewayConfig };
