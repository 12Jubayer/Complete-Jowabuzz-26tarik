import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminPlayers(filters = {}) {
  const response = await adminFetch(
    `/api/admin/players${buildQuery({ ...filters, _t: filters._refresh || undefined })}`,
    {
      headers: getAdminAuthHeaders(),
      cache: 'no-store',
    },
  );
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminPlayerInfo(id) {
  const response = await adminFetch(`/api/admin/players/${id}/info`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function createAdminPlayer(payload) {
  const response = await adminFetch('/api/admin/players', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function changeAdminPlayerPassword(id, password) {
  const response = await adminFetch(`/api/admin/players/${id}/change-password`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ password }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function deleteAdminPlayer(id) {
  const response = await adminFetch(`/api/admin/players/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(true),
  });
  if (!response.ok) await parseError(response);
  const body = await response.json();
  if (!body.success || Number(body.deletedRows) <= 0) {
    throw new Error(body.error || 'Player delete did not remove the account from database');
  }
  return body;
}

export async function updateAdminPlayerStatus(id, status) {
  const response = await adminFetch(`/api/admin/players/${id}/status`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ status }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminPlayerWithdrawBlock(id, blocked) {
  const response = await adminFetch(`/api/admin/players/${id}/withdraw-block`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ blocked }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function adjustAdminPlayerBalance(id, payload) {
  const response = await adminFetch(`/api/admin/players/${id}/adjust-balance`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminPlayerWithdrawChannel(id, withdrawChannel) {
  const response = await adminFetch(`/api/admin/players/${id}/withdraw-channel`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ withdrawChannel }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export default fetchAdminPlayers;
