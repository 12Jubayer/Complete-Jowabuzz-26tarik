import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

const API_URL = '/api/admin/dashboard-stats';

function buildEmptyDailyTransactions() {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    days.push({ date: `${month}-${day}`, count: 0, deposit: 0, withdraw: 0 });
  }

  return days;
}

export function getEmptyDashboardStats() {
  return {
    totalUsers: 0,
    totalDeposit: 0,
    totalWithdraw: 0,
    todayTx: 0,
    dailyTransactions: buildEmptyDailyTransactions(),
  };
}

function normalizeStats(data) {
  return {
    totalUsers: Number(data?.totalUsers ?? 0),
    totalDeposit: Number(data?.totalDeposit ?? 0),
    totalWithdraw: Number(data?.totalWithdraw ?? 0),
    todayTx: Number(data?.todayTx ?? 0),
    dailyTransactions: Array.isArray(data?.dailyTransactions)
      ? data.dailyTransactions.map((item) => ({
          date: item.date,
          count: Number(item.count ?? 0),
          deposit: Number(item.deposit ?? 0),
          withdraw: Number(item.withdraw ?? 0),
        }))
      : buildEmptyDailyTransactions(),
  };
}

export async function fetchDashboardStats() {
  const response = await adminFetch(API_URL, {
    headers: getAdminAuthHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Failed to load dashboard stats (${response.status})`);
  }

  const data = await response.json();

  return {
    success: true,
    data: normalizeStats(data),
  };
}

export default fetchDashboardStats;
