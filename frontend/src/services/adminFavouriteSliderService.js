import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminFavouriteSliders() {
  const response = await adminFetch('/api/admin/favourite-sliders', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function createAdminFavouriteSlider(payload) {
  const response = await adminFetch('/api/admin/favourite-sliders', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminFavouriteSlider(id, payload) {
  const response = await adminFetch(`/api/admin/favourite-sliders/${id}`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function deleteAdminFavouriteSlider(id) {
  const response = await adminFetch(`/api/admin/favourite-sliders/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export default {
  fetchAdminFavouriteSliders,
  createAdminFavouriteSlider,
  updateAdminFavouriteSlider,
  deleteAdminFavouriteSlider,
};
