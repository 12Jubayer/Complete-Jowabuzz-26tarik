import { getPool } from '../config/db.js';
import {
  getBrandingSetting,
  getSiteSetting,
  saveBrandingSetting,
  upsertSiteSetting,
} from './siteSettingsService.js';
import {
  getCommissionSettings,
  updateCommissionSettings,
} from './commissionSettingsService.js';

export const GENERAL_COMMISSION_KEY = 'general_commission';
export const GENERAL_CHAT_KEY = 'general_chat';
export const GENERAL_DEPOSIT_WITHDRAW_KEY = 'general_deposit_withdraw';
export const GENERAL_PAYMENT_GATEWAY_KEY = 'general_payment_gateway';

export const DEFAULT_COMMISSION = {
  agentPct: 3,
  affiliatePct: 5,
  superAffiliatePct: 10,
};

export const DEFAULT_CHAT = {
  enabled: true,
};

export const DEFAULT_DEPOSIT_WITHDRAW = {
  depositMin: 100,
  depositMax: 50000,
  withdrawMin: 500,
  withdrawMax: 25000,
  requireTurnoverForWithdraw: true,
  requireBonusTurnoverForWithdraw: true,
};

export const DEFAULT_PAYMENT_GATEWAY = {
  provider: 'manual',
  apiKey: '',
};

const PAYMENT_PROVIDERS = ['manual', 'winypay', 'sslcommerz', 'aamarpay', 'shurjopay'];

function clampPercent(value, label) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > 100) {
    const error = new Error(`${label} must be between 0 and 100`);
    error.statusCode = 400;
    throw error;
  }
  return Number(num.toFixed(2));
}

function clampMoney(value, label, { min = 0, max = 999999999 } = {}) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < min || num > max) {
    const error = new Error(`${label} must be between ${min} and ${max.toLocaleString()}`);
    error.statusCode = 400;
    throw error;
  }
  return Number(num.toFixed(2));
}

function normalizeSite(payload = {}, existing = null) {
  const base = existing || {
    siteName: 'JowaBuzz',
    currency: 'BDT',
    logoUrl: '',
    faviconUrl: '',
  };

  return {
    siteName: String(payload.siteName ?? payload.name ?? base.siteName).trim(),
    currency: String(payload.currency ?? base.currency).trim().replace(/\.$/, ''),
    logoUrl: String(payload.logoUrl ?? payload.logo_url ?? base.logoUrl).trim(),
    faviconUrl: String(payload.faviconUrl ?? payload.favicon_url ?? base.faviconUrl).trim(),
  };
}

function normalizeCommission(payload = {}) {
  return {
    agentPct: clampPercent(payload.agentPct ?? payload.agent_pct ?? DEFAULT_COMMISSION.agentPct, 'Agent commission'),
    affiliatePct: clampPercent(
      payload.affiliatePct ?? payload.affiliate_pct ?? DEFAULT_COMMISSION.affiliatePct,
      'Affiliate commission',
    ),
    superAffiliatePct: clampPercent(
      payload.superAffiliatePct ?? payload.super_affiliate_pct ?? DEFAULT_COMMISSION.superAffiliatePct,
      'Super affiliate commission',
    ),
  };
}

function normalizeChat(payload = {}) {
  return {
    enabled: payload.enabled !== false && payload.enabled !== 0,
  };
}

function normalizeDepositWithdraw(payload = {}) {
  const depositMin = clampMoney(
    payload.depositMin ?? payload.deposit_min ?? DEFAULT_DEPOSIT_WITHDRAW.depositMin,
    'Minimum deposit',
  );
  const depositMax = clampMoney(
    payload.depositMax ?? payload.deposit_max ?? DEFAULT_DEPOSIT_WITHDRAW.depositMax,
    'Maximum deposit',
  );
  const withdrawMin = clampMoney(
    payload.withdrawMin ?? payload.withdraw_min ?? DEFAULT_DEPOSIT_WITHDRAW.withdrawMin,
    'Minimum withdraw',
  );
  const withdrawMax = clampMoney(
    payload.withdrawMax ?? payload.withdraw_max ?? DEFAULT_DEPOSIT_WITHDRAW.withdrawMax,
    'Maximum withdraw',
  );

  if (depositMax < depositMin) {
    const error = new Error('Maximum deposit must be greater than minimum deposit');
    error.statusCode = 400;
    throw error;
  }

  if (withdrawMax < withdrawMin) {
    const error = new Error('Maximum withdraw must be greater than minimum withdraw');
    error.statusCode = 400;
    throw error;
  }

  return {
    depositMin,
    depositMax,
    withdrawMin,
    withdrawMax,
    requireTurnoverForWithdraw:
      payload.requireTurnoverForWithdraw !== undefined
        ? payload.requireTurnoverForWithdraw !== false && payload.requireTurnoverForWithdraw !== 0
        : payload.require_turnover_for_withdraw !== undefined
          ? payload.require_turnover_for_withdraw !== false && payload.require_turnover_for_withdraw !== 0
          : true,
    requireBonusTurnoverForWithdraw:
      payload.requireBonusTurnoverForWithdraw !== undefined
        ? payload.requireBonusTurnoverForWithdraw !== false && payload.requireBonusTurnoverForWithdraw !== 0
        : payload.require_bonus_turnover_for_withdraw !== undefined
          ? payload.require_bonus_turnover_for_withdraw !== false && payload.require_bonus_turnover_for_withdraw !== 0
          : true,
  };
}

function normalizePaymentGateway(payload = {}) {
  const provider = String(payload.provider ?? DEFAULT_PAYMENT_GATEWAY.provider).trim().toLowerCase();
  if (!PAYMENT_PROVIDERS.includes(provider)) {
    const error = new Error('Invalid payment gateway provider');
    error.statusCode = 400;
    throw error;
  }

  const apiKey = String(payload.apiKey ?? payload.api_key ?? '').trim();
  if (apiKey.length > 500) {
    const error = new Error('API key is too long');
    error.statusCode = 400;
    throw error;
  }

  return { provider, apiKey };
}

async function readJsonSetting(key, fallback) {
  const value = await getSiteSetting(key);
  if (!value || typeof value !== 'object') return { ...fallback };
  return { ...fallback, ...value };
}

export async function migrateGeneralSettingsSchema() {
  const pool = getPool();

  const seeds = [
    [GENERAL_COMMISSION_KEY, DEFAULT_COMMISSION],
    [GENERAL_CHAT_KEY, DEFAULT_CHAT],
    [GENERAL_DEPOSIT_WITHDRAW_KEY, DEFAULT_DEPOSIT_WITHDRAW],
    [GENERAL_PAYMENT_GATEWAY_KEY, DEFAULT_PAYMENT_GATEWAY],
  ];

  for (const [key, fallback] of seeds) {
    const [[existing]] = await pool.query(
      `SELECT id FROM site_settings WHERE setting_key = ? LIMIT 1`,
      [key],
    );
    if (!existing) {
      await upsertSiteSetting(key, fallback);
    }
  }
}

export async function getGeneralSiteSettings() {
  const branding = await getBrandingSetting();
  return normalizeSite({
    siteName: branding.siteName,
    currency: branding.currency,
    logoUrl: branding.logoUrl,
    faviconUrl: branding.faviconUrl,
  });
}

export async function getGeneralCommissionSettings() {
  try {
    const settings = await getCommissionSettings();
    return {
      agentPct: settings.agentDepositPercent,
      affiliatePct: settings.affiliateDepositPercent,
      superAffiliatePct: settings.superAffiliateDepositPercent,
      agentDepositPercent: settings.agentDepositPercent,
      agentWithdrawPercent: settings.agentWithdrawPercent,
      affiliateDepositPercent: settings.affiliateDepositPercent,
      affiliateWithdrawPercent: settings.affiliateWithdrawPercent,
      superAffiliateDepositPercent: settings.superAffiliateDepositPercent,
      superAffiliateWithdrawPercent: settings.superAffiliateWithdrawPercent,
      settlementDay: settings.settlementDay,
      superAffiliateSettlementDay: settings.superAffiliateSettlementDay,
      autoSettlement: settings.autoSettlement,
      manualApproval: settings.manualApproval,
      affiliateWeeklySettlement: settings.affiliateWeeklySettlement,
      affiliateManualApproval: settings.affiliateManualApproval,
    };
  } catch {
    const raw = await readJsonSetting(GENERAL_COMMISSION_KEY, DEFAULT_COMMISSION);
    return normalizeCommission({
      agentPct: raw.agentPct ?? raw.agent_pct,
      affiliatePct: raw.affiliatePct ?? raw.affiliate_pct,
      superAffiliatePct: raw.superAffiliatePct ?? raw.super_affiliate_pct,
    });
  }
}

export async function getGeneralChatSettings() {
  const raw = await readJsonSetting(GENERAL_CHAT_KEY, DEFAULT_CHAT);
  return normalizeChat(raw);
}

export async function getGeneralDepositWithdrawSettings() {
  const raw = await readJsonSetting(GENERAL_DEPOSIT_WITHDRAW_KEY, DEFAULT_DEPOSIT_WITHDRAW);
  return normalizeDepositWithdraw({
    depositMin: raw.depositMin ?? raw.deposit_min,
    depositMax: raw.depositMax ?? raw.deposit_max,
    withdrawMin: raw.withdrawMin ?? raw.withdraw_min,
    withdrawMax: raw.withdrawMax ?? raw.withdraw_max,
    requireTurnoverForWithdraw:
      raw.requireTurnoverForWithdraw ?? raw.require_turnover_for_withdraw,
    requireBonusTurnoverForWithdraw:
      raw.requireBonusTurnoverForWithdraw ?? raw.require_bonus_turnover_for_withdraw,
  });
}

export async function getWithdrawTurnoverSettings() {
  const rules = await getGeneralDepositWithdrawSettings();
  return {
    requireTurnoverForWithdraw: rules.requireTurnoverForWithdraw !== false,
    requireBonusTurnoverForWithdraw: rules.requireBonusTurnoverForWithdraw !== false,
  };
}

export async function getGeneralPaymentGatewaySettings() {
  const raw = await readJsonSetting(GENERAL_PAYMENT_GATEWAY_KEY, DEFAULT_PAYMENT_GATEWAY);
  return normalizePaymentGateway({
    provider: raw.provider,
    apiKey: raw.apiKey ?? raw.api_key,
  });
}

export async function getAllGeneralSettings() {
  const [site, commission, chat, depositWithdraw, paymentGateway] = await Promise.all([
    getGeneralSiteSettings(),
    getGeneralCommissionSettings(),
    getGeneralChatSettings(),
    getGeneralDepositWithdrawSettings(),
    getGeneralPaymentGatewaySettings(),
  ]);

  return {
    site,
    commission,
    chat,
    depositWithdraw,
    paymentGateway,
  };
}

const SECTION_LOADERS = {
  site: getGeneralSiteSettings,
  commission: getGeneralCommissionSettings,
  chat: getGeneralChatSettings,
  'deposit-withdraw': getGeneralDepositWithdrawSettings,
  paymentGateway: getGeneralPaymentGatewaySettings,
};

const SECTION_SAVERS = {
  site: saveGeneralSiteSettings,
  commission: saveGeneralCommissionSettings,
  chat: saveGeneralChatSettings,
  'deposit-withdraw': saveGeneralDepositWithdrawSettings,
  paymentGateway: saveGeneralPaymentGatewaySettings,
};

export async function getGeneralSettingsSection(section) {
  const loader = SECTION_LOADERS[section];
  if (!loader) {
    const error = new Error('Invalid settings section');
    error.statusCode = 400;
    throw error;
  }
  return loader();
}

export async function saveGeneralSiteSettings(payload) {
  const existing = await getGeneralSiteSettings();
  const normalized = normalizeSite(payload, existing);

  if (!normalized.siteName) {
    const error = new Error('Site name is required');
    error.statusCode = 400;
    throw error;
  }

  if (!normalized.currency) {
    const error = new Error('Currency is required');
    error.statusCode = 400;
    throw error;
  }

  await saveBrandingSetting(normalized);
  return normalized;
}

export async function saveGeneralCommissionSettings(payload) {
  const normalized = normalizeCommission(payload);
  await upsertSiteSetting(GENERAL_COMMISSION_KEY, normalized);
  return updateCommissionSettings({
    agentDepositPercent: payload.agentDepositPercent ?? payload.agentPct ?? normalized.agentPct,
    agentWithdrawPercent: payload.agentWithdrawPercent ?? payload.agentPct ?? normalized.agentPct,
    affiliateDepositPercent: payload.affiliateDepositPercent ?? payload.affiliatePct ?? normalized.affiliatePct,
    affiliateWithdrawPercent: payload.affiliateWithdrawPercent ?? 0,
    superAffiliateDepositPercent:
      payload.superAffiliateDepositPercent ?? payload.superAffiliatePct ?? normalized.superAffiliatePct,
    superAffiliateWithdrawPercent: payload.superAffiliateWithdrawPercent ?? 0,
    settlementDay: payload.settlementDay,
    superAffiliateSettlementDay: payload.superAffiliateSettlementDay,
    autoSettlement: payload.autoSettlement,
    manualApproval: payload.manualApproval,
    affiliateWeeklySettlement: payload.affiliateWeeklySettlement,
    affiliateManualApproval: payload.affiliateManualApproval,
  });
}

export async function saveGeneralChatSettings(payload) {
  const normalized = normalizeChat(payload);
  await upsertSiteSetting(GENERAL_CHAT_KEY, normalized);
  return normalized;
}

export async function saveGeneralDepositWithdrawSettings(payload) {
  const normalized = normalizeDepositWithdraw(payload);
  await upsertSiteSetting(GENERAL_DEPOSIT_WITHDRAW_KEY, normalized);
  return normalized;
}

export async function saveGeneralPaymentGatewaySettings(payload) {
  const normalized = normalizePaymentGateway(payload);
  await upsertSiteSetting(GENERAL_PAYMENT_GATEWAY_KEY, normalized);
  return normalized;
}

export async function updateGeneralSettingsSection(section, payload) {
  const saver = SECTION_SAVERS[section];
  if (!saver) {
    const error = new Error('Invalid settings section');
    error.statusCode = 400;
    throw error;
  }
  return saver(payload);
}

export async function validateDepositAmount(amount) {
  const rules = await getGeneralDepositWithdrawSettings();
  const value = Number(amount);

  if (!Number.isFinite(value) || value < rules.depositMin) {
    const error = new Error(`Minimum deposit amount is ${rules.depositMin}`);
    error.statusCode = 400;
    throw error;
  }

  if (value > rules.depositMax) {
    const error = new Error(`Maximum deposit amount is ${rules.depositMax}`);
    error.statusCode = 400;
    throw error;
  }

  return rules;
}

export async function validateWithdrawAmount(amount) {
  const rules = await getGeneralDepositWithdrawSettings();
  const value = Number(amount);

  if (!Number.isFinite(value) || value < rules.withdrawMin) {
    const error = new Error(`Minimum withdraw amount is ${rules.withdrawMin}`);
    error.statusCode = 400;
    throw error;
  }

  if (value > rules.withdrawMax) {
    const error = new Error(`Maximum withdraw amount is ${rules.withdrawMax}`);
    error.statusCode = 400;
    throw error;
  }

  return rules;
}

export default {
  migrateGeneralSettingsSchema,
  getAllGeneralSettings,
  getGeneralSettingsSection,
  updateGeneralSettingsSection,
  getGeneralCommissionSettings,
  getGeneralChatSettings,
  getGeneralDepositWithdrawSettings,
  getGeneralPaymentGatewaySettings,
  validateDepositAmount,
  validateWithdrawAmount,
  getWithdrawTurnoverSettings,
};
