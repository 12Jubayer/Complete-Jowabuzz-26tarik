import { getUserToken } from '../utils/userAuth';

function getAuthHeaders() {
  const token = getUserToken();
  if (!token) throw new Error('Please login again');
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  const message =
    body.error ||
    body.message ||
    (response.status === 404
      ? 'API not found. Server restart করুন (npm run live).'
      : `Request failed (${response.status})`);
  throw new Error(message);
}

async function apiGet(path) {
  const response = await fetch(path, { headers: getAuthHeaders() });
  if (response.status === 401) throw new Error('Session expired. Please login again.');
  if (!response.ok) await parseError(response);
  return response.json();
}

async function apiPost(path, payload = {}) {
  const response = await fetch(path, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (response.status === 401) throw new Error('Session expired. Please login again.');
  if (!response.ok) await parseError(response);
  return response.json();
}

export const requestPlayerAgentWithdrawOtp = (amount, agentUid) =>
  apiPost('/api/user/withdraw/agent/request-otp', { amount: Number(amount), agentUid });

export const fetchPlayerAgentWithdrawRequests = () =>
  apiGet('/api/user/withdraw/agent/requests');

export default {
  requestPlayerAgentWithdrawOtp,
  fetchPlayerAgentWithdrawRequests,
};
