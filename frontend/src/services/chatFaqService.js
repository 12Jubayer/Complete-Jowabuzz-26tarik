import {
  resolveUserTokenForRequest,
  isTokenExpired,
  getUserToken,
} from '../utils/userAuth';
import { getGuestId } from '../utils/guestId';

async function buildHeaders(includeJson = false) {
  const headers = { Accept: 'application/json' };
  const token = await resolveUserTokenForRequest();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers['X-Guest-Id'] = getGuestId();
  }

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

async function buildGuestPayload(payload = {}) {
  const token = await resolveUserTokenForRequest();
  if (token) return payload;
  return { ...payload, guestId: getGuestId() };
}

async function parseApiError(response) {
  const body = await response.json().catch(() => ({}));
  if (body.error) throw new Error(body.error);
  throw new Error(`Request failed (${response.status})`);
}

export async function fetchChatFaqs() {
  const response = await fetch('/api/chat/faqs', {
    headers: await buildHeaders(),
  });
  if (!response.ok) await parseApiError(response);
  const body = await response.json();
  return body.faqs || [];
}

export async function selectChatFaq(faqId) {
  const response = await fetch('/api/chat/faq/select', {
    method: 'POST',
    headers: await buildHeaders(true),
    body: JSON.stringify(await buildGuestPayload({ faqId })),
  });
  if (!response.ok) await parseApiError(response);
  return response.json();
}

export function createLiveChatSocket() {
  const token = getUserToken();
  const guestId = getGuestId();
  const usableToken = token && !isTokenExpired(token) ? token : null;

  return {
    token: usableToken,
    guestId,
    role: 'user',
  };
}
