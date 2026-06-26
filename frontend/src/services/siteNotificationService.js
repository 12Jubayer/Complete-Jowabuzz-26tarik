import { getUserToken } from '../utils/userAuth';

function getAuthHeaders() {
  const token = getUserToken();
  if (!token) throw new Error('Please login again');
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchSiteNotifications(params = {}) {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));

  const query = search.toString();
  const response = await fetch(`/api/site/notifications${query ? `?${query}` : ''}`, {
    headers: getAuthHeaders(),
  });
  if (response.status === 401) throw new Error('Session expired. Please login again.');
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchSiteNotificationUnreadCount() {
  const response = await fetch('/api/site/notifications/unread-count', {
    headers: getAuthHeaders(),
  });
  if (response.status === 401) throw new Error('Session expired. Please login again.');
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function markSiteNotificationRead(id) {
  const response = await fetch(`/api/site/notifications/${id}/read`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (response.status === 401) throw new Error('Session expired. Please login again.');
  if (!response.ok) await parseError(response);
  return response.json();
}

export function subscribeSiteNotificationStream(onNotification, onError) {
  const token = getUserToken();
  if (!token) return () => {};

  const source = new EventSource(
    `/api/site/notifications/stream?token=${encodeURIComponent(token)}`,
  );

  source.addEventListener('notification', (event) => {
    try {
      onNotification(JSON.parse(event.data));
    } catch {
      onNotification(null);
    }
  });

  source.onerror = () => {
    onError?.();
  };

  return () => source.close();
}

export default fetchSiteNotifications;
