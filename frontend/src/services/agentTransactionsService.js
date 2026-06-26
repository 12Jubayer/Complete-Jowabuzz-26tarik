import { getAgentToken } from '../utils/agentAuth';

function getAuthHeaders(includeJson = false) {
  const token = getAgentToken();

  if (!token) {
    throw new Error('Agent session expired. Please login again.');
  }

  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAgentTransactions() {
  const response = await fetch('/api/agent/transactions', {
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    await parseError(response);
  }

  const data = await response.json();
  return data.transactions ?? [];
}

export async function submitTopupRequest(amount) {
  const response = await fetch('/api/agent/topup-request', {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ amount: Number(amount) }),
  });

  if (response.status === 401) {
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    await parseError(response);
  }

  return response.json();
}

export async function submitWithdrawRequest(amount) {
  const response = await fetch('/api/agent/withdraw-request', {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ amount: Number(amount) }),
  });

  if (response.status === 401) {
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    await parseError(response);
  }

  return response.json();
}

export default fetchAgentTransactions;
