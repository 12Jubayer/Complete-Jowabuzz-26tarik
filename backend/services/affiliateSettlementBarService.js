export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const SETTLEMENT_TYPE_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

export const SETTLEMENT_DAY_OPTIONS = [
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
];

function formatDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPeriodDayNames(settlementDay) {
  const day = Number(settlementDay);
  const startDayIndex = (day + 1) % 7;
  return {
    startDayName: WEEKDAYS[startDayIndex],
    endDayName: WEEKDAYS[day],
    weekRange: `${WEEKDAYS[startDayIndex]} → ${WEEKDAYS[day]}`,
  };
}

export function getDailySettlementWindow(referenceDate = new Date()) {
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  const yesterday = new Date(ref);
  yesterday.setDate(yesterday.getDate() - 1);

  const date = formatDate(yesterday);

  return {
    settlementType: 'daily',
    startDate: date,
    endDate: date,
    startDayName: WEEKDAYS[yesterday.getDay()],
    endDayName: WEEKDAYS[yesterday.getDay()],
    weekRange: date,
    name: date,
    dateRange: date,
  };
}

export function getSettlementWindowForDay(settlementDay, referenceDate = new Date()) {
  const day = Number(settlementDay);

  if (!Number.isInteger(day) || day < 0 || day > 6) {
    const error = new Error('Invalid settlement day');
    error.statusCode = 400;
    throw error;
  }

  const { startDayName, endDayName, weekRange } = getPeriodDayNames(day);
  const ref = new Date(referenceDate);
  const currentDay = ref.getDay();
  let daysSinceSettlementEnd = (currentDay - day + 7) % 7;

  if (daysSinceSettlementEnd === 0) {
    daysSinceSettlementEnd = 7;
  }

  const end = new Date(ref);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() - daysSinceSettlementEnd);

  const start = new Date(end);
  start.setDate(start.getDate() - 6);

  const startDate = formatDate(start);
  const endDate = formatDate(end);

  return {
    settlementType: 'weekly',
    startDate,
    endDate,
    startDayName,
    endDayName,
    weekRange,
    name: weekRange,
    settlementDay: day,
    dateRange: `${startDate} – ${endDate}`,
  };
}

export function getSettlementWindowForSettings(settings, referenceDate = new Date()) {
  const type = String(settings?.settlement_type || 'weekly').toLowerCase();
  if (type === 'daily') {
    return getDailySettlementWindow(referenceDate);
  }
  return getSettlementWindowForDay(settings.settlement_day, referenceDate);
}

export function shouldGenerateSettlementNow(settings, referenceDate = new Date()) {
  if (!settings?.auto_settlement) {
    return false;
  }

  const now = new Date(referenceDate);
  if (now.getHours() !== 0 || now.getMinutes() !== 5) {
    return false;
  }

  const type = String(settings?.settlement_type || 'weekly').toLowerCase();
  if (type === 'daily') {
    return true;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.getDay() === Number(settings.settlement_day);
}
