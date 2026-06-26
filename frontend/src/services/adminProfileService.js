import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminProfile() {
  const response = await adminFetch('/api/admin/profile', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminProfile(name) {
  const response = await adminFetch('/api/admin/profile', {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ name }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminProfilePassword(password) {
  const response = await adminFetch('/api/admin/profile/password', {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ password }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export default {
  fetchAdminProfile,
  updateAdminProfile,
  updateAdminProfilePassword,
};
