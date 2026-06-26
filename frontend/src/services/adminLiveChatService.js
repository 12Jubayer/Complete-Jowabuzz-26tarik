import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';
import { getAdminToken } from '../utils/adminAuth';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminLiveChatConversations(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const response = await adminFetch(`/api/admin/live-chat/conversations${query}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminLiveChatMessages(conversationId) {
  const response = await adminFetch(`/api/admin/live-chat/conversations/${conversationId}/messages`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function sendAdminLiveChatReply(conversationId, payload) {
  const response = await adminFetch(`/api/admin/live-chat/conversations/${conversationId}/reply`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function uploadAdminLiveChatAttachment(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await adminFetch('/api/admin/live-chat/upload', {
    method: 'POST',
    headers: getAdminAuthHeaders(false),
    body: formData,
  });
  if (!response.ok) await parseError(response);
  const body = await response.json();
  return {
    url: body.url,
    attachmentUrl: body.url,
    attachmentType: body.attachmentType || file.type,
  };
}

export function createAdminLiveChatSocketAuth() {
  return {
    token: getAdminToken(),
    role: 'admin',
  };
}

export default fetchAdminLiveChatConversations;
