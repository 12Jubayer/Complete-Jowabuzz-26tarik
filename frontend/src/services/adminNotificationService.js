import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminNotifications(params = {}) {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));

  const query = search.toString();
  const response = await adminFetch(`/api/admin/notifications${query ? `?${query}` : ''}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function sendAdminNotification(payload) {
  const response = await adminFetch('/api/admin/notifications', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export default fetchAdminNotifications;
