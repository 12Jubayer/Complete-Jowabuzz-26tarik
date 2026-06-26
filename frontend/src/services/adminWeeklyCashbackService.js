import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminWeeklyCashback() {
  const response = await adminFetch('/api/admin/weekly-cashback', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function saveAdminWeeklyCashback(payload) {
  const response = await adminFetch('/api/admin/weekly-cashback', {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminWeeklyCashbackPayouts(limit = 50) {
  const response = await adminFetch(`/api/admin/weekly-cashback/payouts?limit=${limit}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}
