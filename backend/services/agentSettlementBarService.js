export const SETTLEMENT_TYPE = 'monthly';

function formatDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getEffectiveDayOfMonth(year, monthIndex, settlementDay) {
  const day = Number(settlementDay);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    const error = new Error('Monthly settlement day must be between 1 and 31');
    error.statusCode = 400;
    throw error;
  }
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(day, daysInMonth);
}

function buildWindow(startDate, endDate, settlementDayOfMonth, mode) {
  return {
    settlementType: SETTLEMENT_TYPE,
    startDate,
    endDate,
    settlementDayOfMonth,
    mode,
    weekRange: `${startDate} → ${endDate}`,
    name: `Monthly ${startDate} → ${endDate}`,
    dateRange: `${startDate} – ${endDate}`,
  };
}

export function getClosedSettlementWindow(settlementDayOfMonth, referenceDate = new Date()) {
  const settlementDay = Number(settlementDayOfMonth || 3);
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  const yesterday = new Date(ref);
  yesterday.setDate(yesterday.getDate() - 1);

  const endYear = yesterday.getFullYear();
  const endMonth = yesterday.getMonth();
  const effectiveEndDay = getEffectiveDayOfMonth(endYear, endMonth, settlementDay);
  const endDate = formatDate(new Date(endYear, endMonth, effectiveEndDay));

  let startMonth = endMonth - 1;
  let startYear = endYear;
  if (startMonth < 0) {
    startMonth = 11;
    startYear -= 1;
  }
  const effectiveStartDay = getEffectiveDayOfMonth(startYear, startMonth, settlementDay);
  const startDate = formatDate(new Date(startYear, startMonth, effectiveStartDay));

  return buildWindow(startDate, endDate, settlementDay, 'closed');
}

export function getOpenSettlementWindow(settlementDayOfMonth, referenceDate = new Date()) {
  const settlementDay = Number(settlementDayOfMonth || 3);
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  const year = ref.getFullYear();
  const month = ref.getMonth();
  const day = ref.getDate();
  const effectiveSettlementDay = getEffectiveDayOfMonth(year, month, settlementDay);

  let startYear;
  let startMonth;
  if (day >= effectiveSettlementDay) {
    startYear = year;
    startMonth = month;
  } else {
    startMonth = month - 1;
    startYear = year;
    if (startMonth < 0) {
      startMonth = 11;
      startYear -= 1;
    }
  }

  const effectiveStartDay = getEffectiveDayOfMonth(startYear, startMonth, settlementDay);
  const startDate = formatDate(new Date(startYear, startMonth, effectiveStartDay));
  const endDate = formatDate(ref);

  return buildWindow(startDate, endDate, settlementDay, 'open');
}

export function getMonthlySettlementWindow(settlementDayOfMonth, referenceDate = new Date()) {
  return getClosedSettlementWindow(settlementDayOfMonth, referenceDate);
}

export function getSettlementWindowForSettings(settings, referenceDate = new Date(), mode = 'open') {
  const settlementDay = Number(settings?.settlement_day ?? settings?.settlementDayOfMonth ?? 3);
  if (mode === 'closed') {
    return getClosedSettlementWindow(settlementDay, referenceDate);
  }
  return getOpenSettlementWindow(settlementDay, referenceDate);
}

export function shouldGenerateSettlementNow(settings, referenceDate = new Date()) {
  if (!settings?.auto_settlement && !settings?.autoSettlement) return false;

  const now = new Date(referenceDate);
  if (now.getHours() !== 0 || now.getMinutes() !== 5) return false;

  const settlementDay = Number(settings?.settlement_day ?? settings?.settlementDayOfMonth ?? 3);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const effectiveDay = getEffectiveDayOfMonth(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    settlementDay,
  );

  return yesterday.getDate() === effectiveDay;
}

export function getMonthlyPreview(settlementDayOfMonth) {
  const day = Number(settlementDayOfMonth || 3);
  const nextDay = Math.min(day + 1, 31);
  return {
    typeLabel: 'Monthly',
    period: `Current cycle: day ${day} 00:00 → today 23:59`,
    closedPeriod: `Closed cycle: previous month day ${day} → current month day ${day}`,
    pendingTime: `Day after ${day} at 12:05 AM for closed cycle`,
    detail: `Summary & manual settlement use open period (day ${day} → today). Cron uses closed period.`,
  };
}
