import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function fetchAdminGameImages(filters = {}) {
  const response = await adminFetch(`/api/admin/game-images${buildQuery(filters)}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminGameImage(gameId, customImageUrl) {
  const response = await adminFetch(`/api/admin/game-images/${gameId}`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ customImageUrl }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function deleteAdminGameCustomImage(gameId) {
  const response = await adminFetch(`/api/admin/game-images/${gameId}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function uploadAdminGameImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await adminFetch('/api/admin/upload/game-image', {
    method: 'POST',
    headers: getAdminAuthHeaders(false),
    body: formData,
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export default fetchAdminGameImages;
