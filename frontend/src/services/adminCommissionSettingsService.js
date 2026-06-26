import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminCommissionSettings() {
  const response = await adminFetch('/api/admin/commission-settings', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function saveAdminCommissionSettings(payload) {
  const response = await adminFetch('/api/admin/commission-settings', {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function resetAdminCommissionSettings() {
  const response = await adminFetch('/api/admin/commission-settings/reset', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminCommissionRecords(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      query.set(key, String(value));
    }
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await adminFetch(`/api/admin/commission-settings/records${suffix}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function approveAdminCommissionRecord(source, id) {
  const response = await adminFetch(`/api/admin/commission-settings/records/${source}/${id}/approve`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function rejectAdminCommissionRecord(source, id) {
  const response = await adminFetch(`/api/admin/commission-settings/records/${source}/${id}/reject`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function downloadAdminCommissionExport(format, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      query.set(key, String(value));
    }
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await adminFetch(
    `/api/admin/commission-settings/records/export/${format}${suffix}`,
    { headers: getAdminAuthHeaders() },
  );
  if (!response.ok) await parseError(response);
  const blob = await response.blob();
  const filename =
    format === 'pdf' ? 'commission-records.pdf' : 'commission-records.csv';
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
