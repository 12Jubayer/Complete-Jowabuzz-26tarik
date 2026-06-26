import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminGamingApiSettings() {
  const response = await adminFetch('/api/admin/gaming-api-settings', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function saveAdminGamingApiSettings(payload) {
  const response = await adminFetch('/api/admin/gaming-api-settings', {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function testAdminGamingApiConnection() {
  const response = await adminFetch('/api/admin/gaming-api-settings/test-connection', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function testAdminGamingGameLaunch(payload) {
  const response = await adminFetch('/api/admin/gaming-api-settings/test-game-launch', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function enableAdminGamingProvider() {
  const response = await adminFetch('/api/admin/gaming-api-settings/enable', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function disableAdminGamingProvider() {
  const response = await adminFetch('/api/admin/gaming-api-settings/disable', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminGamingTransactions(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await adminFetch(`/api/admin/gaming-api-settings/transactions${suffix}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function downloadAdminGamingTransactionsExport(format, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await adminFetch(
    `/api/admin/gaming-api-settings/transactions/export/${format}${suffix}`,
    { headers: getAdminAuthHeaders() },
  );
  if (!response.ok) await parseError(response);
  const blob = await response.blob();
  const filename = format === 'pdf' ? 'gaming-transactions.pdf' : 'gaming-transactions.csv';
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchPublicGamingGatewayStatus() {
  const response = await fetch('/api/site-config/gaming-gateway', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to load gaming gateway status');
  return response.json();
}


export async function fetchAdminGamingCallbackLogs() {
  const response = await adminFetch('/api/admin/gaming-api-settings/callback-logs', {
    method: 'GET',
  });
  return response;
}
