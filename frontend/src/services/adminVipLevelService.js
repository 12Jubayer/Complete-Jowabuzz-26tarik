import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminVipLevels() {
  const response = await adminFetch('/api/admin/vip-levels', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function createAdminVipLevel(payload) {
  const response = await adminFetch('/api/admin/vip-levels', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminVipLevel(id, payload) {
  const response = await adminFetch(`/api/admin/vip-levels/${id}`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function bulkUpdateAdminVipLevels(levels) {
  const response = await adminFetch('/api/admin/vip-levels/bulk-update', {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ levels }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function deleteAdminVipLevel(id) {
  const response = await adminFetch(`/api/admin/vip-levels/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export default fetchAdminVipLevels;
