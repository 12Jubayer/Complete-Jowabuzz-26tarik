import { getAgentToken } from '../utils/agentAuth';

function getAuthHeaders() {
  const token = getAgentToken();

  if (!token) {
    throw new Error('Agent session expired. Please login again.');
  }

  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAgentDashboard() {
  const response = await fetch('/api/agent/dashboard', {
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    await parseError(response);
  }

  const data = await response.json();

  const balance = Number(data.balance ?? 0);
  const displayBalance = Number(data.displayBalance ?? data.balance ?? 0);

  return {
    uid: data.uid,
    name: data.name,
    mobile: data.mobile,
    balance,
    totalDeposit: Number(data.totalDeposit ?? 0),
    totalTopup: Number(data.totalTopup ?? 0),
    totalWithdraw: Number(data.totalWithdraw ?? 0),
    lifetimeBalance: Number(data.lifetimeBalance ?? 0),
    displayBalance,
    commissionBalance: Number(data.commissionBalance ?? 0),
  };
}

export default fetchAgentDashboard;
