import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

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

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminHotGames() {
  const response = await adminFetch('/api/admin/hot-games', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function searchAdminGames(query, limit = 30) {
  const response = await adminFetch(`/api/admin/games/search${buildQuery({ q: query, limit })}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function addAdminHotGame(gameId) {
  const response = await adminFetch('/api/admin/hot-games', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ gameId }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function removeAdminHotGame(gameId) {
  const response = await adminFetch(`/api/admin/hot-games/${gameId}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function reorderAdminHotGames(gameIds) {
  const response = await adminFetch('/api/admin/hot-games/reorder', {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ gameIds }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminGames(filters = {}) {
  const response = await adminFetch(`/api/admin/games${buildQuery(filters)}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminGameFlags(id, flags) {
  const response = await adminFetch(`/api/admin/games/${id}/update-flags`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(flags),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function bulkUpdateAdminGameFlags(payload) {
  const response = await adminFetch('/api/admin/games/bulk-update-flags', {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function toggleAdminGame(id, field, value) {
  const response = await adminFetch(`/api/admin/games/${id}/toggle`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ field, value }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function bulkToggleAdminGames({ gameIds, field, value }) {
  const response = await adminFetch('/api/admin/games/bulk-toggle', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ gameIds, field, value }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminGameDetails(id, payload) {
  const response = await adminFetch(`/api/admin/games/${id}/update-details`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminProviderDetails(id, payload) {
  const response = await adminFetch(`/api/admin/providers/${id}/update-details`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminProviders() {
  const response = await adminFetch('/api/admin/providers', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function toggleAdminProvider(id, enabled) {
  const response = await adminFetch(`/api/admin/providers/${id}/toggle`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ enabled }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export default {
  fetchAdminHotGames,
  searchAdminGames,
  addAdminHotGame,
  removeAdminHotGame,
  reorderAdminHotGames,
  fetchAdminGames,
  updateAdminGameFlags,
  bulkUpdateAdminGameFlags,
  toggleAdminGame,
  bulkToggleAdminGames,
  updateAdminGameDetails,
  fetchAdminProviders,
  toggleAdminProvider,
  updateAdminProviderDetails,
};
