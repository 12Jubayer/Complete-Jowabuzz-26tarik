import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || body.message || `Request failed (${response.status})`);
}

export async function fetchAdminChatFaqs() {
  const response = await adminFetch('/api/admin/chat/faqs', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  const body = await response.json();
  return body.faqs || [];
}

export async function fetchAdminChatSettings() {
  const response = await adminFetch('/api/admin/chat/settings', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  const body = await response.json();
  return body.settings || { enabled: true, fallbackMessage: '' };
}

export async function saveAdminChatSettings(payload) {
  const response = await adminFetch('/api/admin/chat/settings', {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function createAdminChatFaq(payload) {
  const response = await adminFetch('/api/admin/chat/faqs', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminChatFaq(id, payload) {
  const response = await adminFetch(`/api/admin/chat/faqs/${id}`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function deleteAdminChatFaq(id) {
  const response = await adminFetch(`/api/admin/chat/faqs/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}
