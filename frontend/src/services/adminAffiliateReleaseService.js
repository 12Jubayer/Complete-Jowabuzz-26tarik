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

export async function fetchAffiliateReleaseList(filters = {}) {
  const response = await adminFetch(`/api/admin/affiliates-release-list${buildQuery(filters)}`, {
    headers: getAdminAuthHeaders(),
  });

  if (!response.ok) await parseError(response);
  return response.json();
}

export async function approveAffiliateRelease(id) {
  const response = await adminFetch(`/api/admin/affiliate-release/${id}/approve`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
  });

  if (!response.ok) await parseError(response);
  return response.json();
}

export async function rejectAffiliateRelease(id) {
  const response = await adminFetch(`/api/admin/affiliate-release/${id}/reject`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
  });

  if (!response.ok) await parseError(response);
  return response.json();
}

export async function releaseAffiliateCommission(id) {
  const response = await adminFetch(`/api/admin/affiliate-release/${id}/release`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
  });

  if (!response.ok) await parseError(response);
  return response.json();
}

export default fetchAffiliateReleaseList;
