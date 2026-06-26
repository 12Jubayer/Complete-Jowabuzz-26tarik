const CURRENCY_SYMBOLS = {
  BDT: '৳',
  INR: '₹',
  PKR: 'Rs',
  NPR: 'Rs',
};

export function getCurrencySymbol(currency = 'BDT') {
  const code = String(currency || 'BDT').trim().replace(/\.$/, '').toUpperCase();
  return CURRENCY_SYMBOLS[code] || code;
}

export function formatCurrencyLabel(currency = 'BDT') {
  const code = String(currency || 'BDT').trim().replace(/\.$/, '').toUpperCase();
  const symbol = getCurrencySymbol(code);
  if (symbol === code) return code;
  return `${code} (${symbol})`;
}

export default getCurrencySymbol;
