const COMMISSION_FIELD_KEYS = new Set([
  'commissionPercent',
  'commission_percent',
  'commissionRate',
  'commission_rate',
  'default_commission_percent',
  'settlement_commission_percent',
]);

function shouldStripFormula(value) {
  return typeof value === 'string' && /commission\s*%|commission_percent|commission_percentage/i.test(value);
}

export function stripAffiliateCommissionFields(value) {
  if (Array.isArray(value)) {
    return value.map(stripAffiliateCommissionFields);
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const next = {};
    for (const [key, nested] of Object.entries(value)) {
      if (COMMISSION_FIELD_KEYS.has(key)) continue;
      if (key === 'formula' && shouldStripFormula(nested)) continue;
      next[key] = stripAffiliateCommissionFields(nested);
    }
    return next;
  }

  return value;
}

export function affiliateResponseSanitizer(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (body) => originalJson(stripAffiliateCommissionFields(body));
  next();
}

export default affiliateResponseSanitizer;
