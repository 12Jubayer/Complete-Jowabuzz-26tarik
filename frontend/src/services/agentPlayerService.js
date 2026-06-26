import { getAgentToken } from '../utils/agentAuth';

function getAuthHeaders(includeJson = false) {
  const token = getAgentToken();
  if (!token) throw new Error('Agent session expired. Please login again.');
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

export async function searchPlayers(query) {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/agent/players/search?${params}`, {
    headers: getAuthHeaders(),
  });

  if (response.status === 401) throw new Error('Session expired. Please login again.');
  if (!response.ok) await parseError(response);

  const data = await response.json();
  return data.players ?? [];
}

export async function depositToPlayer(playerId, amount) {
  const response = await fetch('/api/agent/players/deposit', {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ playerId, amount: Number(amount) }),
  });

  if (response.status === 401) throw new Error('Session expired. Please login again.');
  if (!response.ok) await parseError(response);

  return response.json();
}

export async function confirmPlayerWithdrawByOtp(otp) {
  const response = await fetch('/api/agent/players/withdraw/confirm-otp', {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify({ otp: String(otp).trim() }),
  });

  if (response.status === 401) throw new Error('Session expired. Please login again.');
  if (!response.ok) await parseError(response);

  return response.json();
}

export async function fetchPendingPlayerWithdrawRequests() {
  const response = await fetch('/api/agent/players/withdraw/pending', {
    headers: getAuthHeaders(),
  });

  if (response.status === 401) throw new Error('Session expired. Please login again.');
  if (!response.ok) await parseError(response);

  const data = await response.json();
  return data.requests ?? [];
}

export default searchPlayers;
