import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  if (params.search) search.set('search', params.search);
  if (params.status) search.set('status', params.status);
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function fetchAdminPromotions(params = {}) {
  const response = await adminFetch(`/api/admin/promotions${buildQuery(params)}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function createAdminPromotion(payload) {
  const response = await adminFetch('/api/admin/promotions', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminPromotion(id, payload) {
  const response = await adminFetch(`/api/admin/promotions/${id}`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function deleteAdminPromotion(id) {
  const response = await adminFetch(`/api/admin/promotions/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function reorderAdminPromotions(ids) {
  const response = await adminFetch('/api/admin/promotions/reorder', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function uploadAdminPromotionImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await adminFetch('/api/admin/upload/promotion-image', {
    method: 'POST',
    headers: getAdminAuthHeaders(false),
    body: formData,
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export default fetchAdminPromotions;
