import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminBonusProgress(search = '', source = 'all') {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (source && source !== 'all') params.set('source', source);
  const query = params.toString();
  const response = await adminFetch(
    `/api/admin/bonus-progress${query ? `?${query}` : ''}`,
    { headers: getAdminAuthHeaders() },
  );
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminBonusProgressDetail(id) {
  const response = await adminFetch(`/api/admin/bonus-progress/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function cancelAdminBonusProgress(id) {
  const response = await adminFetch(`/api/admin/bonus-progress/${id}/cancel`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({}),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function resetAdminBonusProgress(id) {
  const response = await adminFetch(`/api/admin/bonus-progress/${id}/reset`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({}),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}
