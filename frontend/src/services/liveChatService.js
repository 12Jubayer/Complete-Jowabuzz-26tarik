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
  if (body.error) {
    throw new Error(body.error);
  }
  if (body.message && typeof body.message === 'string' && body.success === false) {
    throw new Error(body.message);
  }
  throw new Error(`Request failed (${response.status})`);
}

async function parseUploadError(response) {
  const body = await response.json().catch(() => ({}));

  if (body.error) {
    throw new Error(body.error);
  }

  if (response.status === 401) {
    if (body.code === 'TOKEN_EXPIRED') {
      throw new Error('Session expired, please login again');
    }
    if (body.code === 'TOKEN_INVALID') {
      throw new Error('Invalid session');
    }
    throw new Error('Please login first');
  }

  throw new Error('Upload failed, আবার চেষ্টা করুন');
}

export async function fetchSiteLiveChatMessages() {
  const response = await fetch('/api/site/live-chat/messages', {
    headers: await buildHeaders(),
  });
  if (!response.ok) await parseApiError(response);
  return response.json();
}

export async function sendSiteLiveChatMessage(payload) {
  const response = await fetch('/api/site/live-chat/messages', {
    method: 'POST',
    headers: await buildHeaders(true),
    body: JSON.stringify(await buildGuestPayload(payload)),
  });
  if (!response.ok) await parseApiError(response);
  return response.json();
}

export function extractSentMessage(result) {
  if (result?.message && typeof result.message === 'object') {
    return result.message;
  }
  return result?.data || null;
}

export async function uploadLiveChatAttachment(file) {
  async function postUpload(headers) {
    const formData = new FormData();
    formData.append('file', file);
    return fetch('/api/live-chat/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  let response = await postUpload(await buildHeaders(false));

  if (response.status === 401) {
    const refreshed = await resolveUserTokenForRequest();
    if (refreshed) {
      response = await postUpload(await buildHeaders(false));
    }
  }

  if (!response.ok) {
    await parseUploadError(response);
  }

  const body = await response.json();
  return {
    url: body.url,
    attachmentType: body.attachmentType || file.type,
  };
}

export async function markLiveChatMessageRead(id) {
  const response = await fetch(`/api/live-chat/messages/${id}/read`, {
    method: 'PATCH',
    headers: await buildHeaders(true),
    body: JSON.stringify(await buildGuestPayload()),
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

export default fetchSiteLiveChatMessages;
