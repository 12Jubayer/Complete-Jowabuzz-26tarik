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

export async function fetchAdminAffiliates(filters = {}) {
  const response = await adminFetch(`/api/admin/affiliates${buildQuery(filters)}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminAffiliateInfo(id) {
  const response = await adminFetch(`/api/admin/affiliates/${id}/info`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function createAdminAffiliateUser(payload) {
  const response = await adminFetch('/api/admin/affiliates', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function approveAdminAffiliateUser(id) {
  const response = await adminFetch(`/api/admin/affiliates/${id}/approve`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function rejectAdminAffiliateUser(id) {
  const response = await adminFetch(`/api/admin/affiliates/${id}/reject`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminAffiliateUserStatus(id, status) {
  const response = await adminFetch(`/api/admin/affiliates/${id}/status`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ status }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function adjustAdminAffiliateBalance(id, payload) {
  const response = await adminFetch(`/api/admin/affiliates/${id}/adjust-balance`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function changeAdminAffiliatePassword(id, payload) {
  const response = await adminFetch(`/api/admin/affiliates/${id}/change-password`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export default fetchAdminAffiliates;
