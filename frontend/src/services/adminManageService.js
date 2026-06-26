import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';
import {
  ADMIN_PERMISSION_OPTIONS,
  buildEmptyPermissions,
} from '../utils/adminPermissions';

export { ADMIN_PERMISSION_OPTIONS, buildEmptyPermissions };

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

export async function fetchAdminAccounts(filters = {}) {
  const response = await adminFetch(`/api/admin/admins${buildQuery(filters)}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminAccount(id) {
  const response = await adminFetch(`/api/admin/admins/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function createAdminAccount(payload) {
  const response = await adminFetch('/api/admin/admins', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminPermissions(id, permissions) {
  const response = await adminFetch(`/api/admin/admins/${id}/permissions`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ permissions }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateSubAdminStatus(id, status) {
  const response = await adminFetch(`/api/admin/sub-admins/${id}/status`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ status }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function deleteSubAdmin(id) {
  const response = await adminFetch(`/api/admin/sub-admins/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminAccountStatus(id, status) {
  const response = await adminFetch(`/api/admin/admins/${id}/status`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ status }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function changeAdminAccountPassword(id, payload) {
  const response = await adminFetch(`/api/admin/admins/${id}/change-password`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function deleteAdminAccount(id) {
  const response = await adminFetch(`/api/admin/admins/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(true),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export default fetchAdminAccounts;
