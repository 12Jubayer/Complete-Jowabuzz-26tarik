import { getAgentToken } from '../utils/agentAuth';

function getAuthHeaders() {
  const token = getAgentToken();

  if (!token) {
    throw new Error('Agent session expired. Please login again.');
  }

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function requestWithdrawOtp(amount) {
  const response = await fetch('/api/agent/withdraw/request-otp', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ amount }),
  });

  if (response.status === 401) {
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    await parseError(response);
  }

  return response.json();
}

export async function confirmWithdraw(amount, otp) {
  const response = await fetch('/api/agent/withdraw/confirm', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ amount, otp }),
  });

  if (response.status === 401) {
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    await parseError(response);
  }

  return response.json();
}
