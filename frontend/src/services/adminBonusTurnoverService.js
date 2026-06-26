import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminBonusTurnoverRules() {
  const response = await adminFetch('/api/admin/bonus-turnover', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function createAdminBonusTurnoverRule(payload) {
  const response = await adminFetch('/api/admin/bonus-turnover', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminBonusTurnoverRule(id, payload) {
  const response = await adminFetch(`/api/admin/bonus-turnover/${id}`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function deleteAdminBonusTurnoverRule(id) {
  const response = await adminFetch(`/api/admin/bonus-turnover/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchSiteActiveBonusTurnover() {
  const response = await fetch('/api/site/active-bonus-turnover', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to load bonus offers');
  return response.json();
}

export default fetchAdminBonusTurnoverRules;
