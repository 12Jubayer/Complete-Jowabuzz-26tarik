import { clearAdminSession, getAdminToken } from './adminAuth';

export class AdminSessionExpiredError extends Error {
  constructor(message = 'Session expired. Please login again.') {
    super(message);
    this.name = 'AdminSessionExpiredError';
  }
}

export function handleAdminUnauthorized() {
  clearAdminSession();
}

export function getAdminAuthHeaders(includeJson = false) {
  const token = getAdminToken();
  if (!token) {
    throw new AdminSessionExpiredError('Admin session expired. Please login again.');
  }

  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

export async function adminFetch(url, options = {}) {
  let response;

  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('Unable to connect to server. Please try again.');
  }

  if (response.status === 401) {
    handleAdminUnauthorized();
    throw new AdminSessionExpiredError();
  }

  return response;
}

export default adminFetch;
