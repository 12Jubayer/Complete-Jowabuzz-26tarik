import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminSmsSettings() {
  const response = await adminFetch('/api/admin/sms-settings', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function saveAdminSmsSettings(payload) {
  const response = await adminFetch('/api/admin/sms-settings', {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function testAdminSms(payload) {
  const response = await adminFetch('/api/admin/sms-settings/test-sms', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function enableAdminSmsProvider() {
  const response = await adminFetch('/api/admin/sms-settings/enable', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function disableAdminSmsProvider() {
  const response = await adminFetch('/api/admin/sms-settings/disable', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminSmsLogs(search = '') {
  const suffix = search ? `?search=${encodeURIComponent(search)}` : '';
  const response = await adminFetch(`/api/admin/sms-settings/logs${suffix}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function sendAdminBulkSms(payload) {
  const response = await adminFetch('/api/admin/sms-settings/bulk-send', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}
