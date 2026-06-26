import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminPopupBanners() {
  const response = await adminFetch('/api/admin/popup-banners', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function createAdminPopupBanner(payload) {
  const response = await adminFetch('/api/admin/popup-banners', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminPopupBanner(id, payload) {
  const response = await adminFetch(`/api/admin/popup-banners/${id}`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function deleteAdminPopupBanner(id) {
  const response = await adminFetch(`/api/admin/popup-banners/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}
