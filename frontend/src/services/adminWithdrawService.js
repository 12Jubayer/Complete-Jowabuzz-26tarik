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

export async function fetchAdminWithdrawals(filters = {}) {
  const response = await adminFetch(`/api/admin/withdrawals${buildQuery(filters)}`, {
    headers: getAdminAuthHeaders(),
  });

  if (!response.ok) await parseError(response);
  return response.json();
}

export async function approveAdminWithdrawal(id) {
  const response = await adminFetch(`/api/admin/withdrawals/${id}/approve`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
  });

  if (!response.ok) await parseError(response);
  return response.json();
}

export async function rejectAdminWithdrawal(id) {
  const response = await adminFetch(`/api/admin/withdrawals/${id}/reject`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
  });

  if (!response.ok) await parseError(response);
  return response.json();
}

export default fetchAdminWithdrawals;
