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

export async function fetchAgentCommissions() {
  const response = await fetch('/api/agent/commissions', {
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    await parseError(response);
  }

  return response.json();
}

export async function fetchAgentCommissionSettlements() {
  const response = await fetch('/api/agent/commission/settlements', {
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    await parseError(response);
  }

  return response.json();
}
