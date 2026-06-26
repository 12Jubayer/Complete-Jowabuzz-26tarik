import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) {
    return { unauthorized: true, success: false, error: body.error || 'Unauthorized' };
  }
  if (!response.ok) {
    return { success: false, error: body.error || `Request failed (${response.status})` };
  }
  return { success: true, ...body };
}

export async function fetchAdminAppDownloadSettings() {
  const response = await adminFetch('/api/admin/site-config/app-download', {
    headers: getAdminAuthHeaders(),
  });
  return parseResponse(response);
}

export async function updateAdminAppDownloadSettings(payload) {
  const response = await adminFetch('/api/admin/site-config/app-download', {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function uploadAdminAppApk(file) {
  const formData = new FormData();
  formData.append('apk', file);

  const response = await adminFetch('/api/admin/site-config/app-download/apk', {
    method: 'POST',
    headers: getAdminAuthHeaders(false),
    body: formData,
  });
  return parseResponse(response);
}

export async function removeAdminAppApk() {
  const response = await adminFetch('/api/admin/site-config/app-download/apk', {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  return parseResponse(response);
}
