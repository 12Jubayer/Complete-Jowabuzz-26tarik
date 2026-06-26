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

export async function fetchAdminEWallets(filters = {}) {
  const response = await adminFetch(`/api/admin/e-wallets${buildQuery(filters)}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminEWalletInfo(id) {
  const response = await adminFetch(`/api/admin/e-wallets/${id}/info`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function createAdminEWallet(payload) {
  const response = await adminFetch('/api/admin/e-wallets', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminEWalletStatus(id, status) {
  const response = await adminFetch(`/api/admin/e-wallets/${id}/status`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ status }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function adjustAdminEWalletBalance(id, payload) {
  const response = await adminFetch(`/api/admin/e-wallets/${id}/adjust-balance`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function deleteAdminEWallet(id) {
  const response = await adminFetch(`/api/admin/e-wallets/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(true),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export default fetchAdminEWallets;
