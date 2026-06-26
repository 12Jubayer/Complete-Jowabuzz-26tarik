const USER_TOKEN_KEY = 'userToken';
const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

function isJwtFormat(value) {
  return (
    typeof value === 'string' &&
    value.split('.').length === 3 &&
    !value.startsWith('jb_token_')
  );
}

function readStoredJwt() {
  const keys = [USER_TOKEN_KEY, TOKEN_KEY, 'token', 'authToken'];
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (isJwtFormat(value)) return value;
  }
  return null;
}

export function getUserToken() {
  return readStoredJwt();
}

export function getRefreshToken() {
  const value = localStorage.getItem(REFRESH_TOKEN_KEY);
  return value || null;
}

export function setUserToken(token) {
  if (token && isJwtFormat(token)) {
    localStorage.setItem(USER_TOKEN_KEY, token);
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  if (!token) {
    localStorage.removeItem(USER_TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function setRefreshToken(token) {
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
  else localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearUserToken() {
  localStorage.removeItem(USER_TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isUserApiAuthenticated() {
  return !!getUserToken();
}

function decodeJwtPayload(token) {
  const segment = token.split('.')[1];
  if (!segment) return null;
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return JSON.parse(atob(padded));
}

export function getTokenExpiryMs(token) {
  try {
    const payload = decodeJwtPayload(token);
    return payload?.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token, skewMs = 30_000) {
  const expiry = getTokenExpiryMs(token);
  if (!expiry) return false;
  return Date.now() >= expiry - skewMs;
}

export async function refreshUserAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) return null;

    if (body.token) setUserToken(body.token);
    if (body.refreshToken) setRefreshToken(body.refreshToken);
    return body.token || null;
  } catch {
    return null;
  }
}

export async function ensureValidUserToken() {
  const token = getUserToken();
  if (token && !isTokenExpired(token)) return token;
  if (token && isTokenExpired(token)) {
    const refreshed = await refreshUserAccessToken();
    if (refreshed) return refreshed;
    clearUserToken();
    return null;
  }
  return null;
}

export async function resolveUserTokenForRequest() {
  return ensureValidUserToken();
}

export function hasRefreshToken() {
  return !!getRefreshToken();
}

export default getUserToken;
