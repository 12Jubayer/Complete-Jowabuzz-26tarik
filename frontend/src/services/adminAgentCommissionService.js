import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminAgentCommissionSummary() {
  const response = await adminFetch('/api/admin/agent-commission/summary', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminAgentCommissionAgents(search = '') {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  const query = params.toString();
  const response = await adminFetch(
    `/api/admin/agent-commission/agents${query ? `?${query}` : ''}`,
    { headers: getAdminAuthHeaders() },
  );
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminAgentCommissionTransactions({ search = '', type = 'all' } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (type && type !== 'all') params.set('type', type);
  const query = params.toString();
  const response = await adminFetch(
    `/api/admin/agent-commission/transactions${query ? `?${query}` : ''}`,
    { headers: getAdminAuthHeaders() },
  );
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminAgentCommissionSettings() {
  const response = await adminFetch('/api/admin/agent-commission/settings', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function saveAdminAgentCommissionSettings(payload) {
  const response = await adminFetch('/api/admin/agent-commission/settings', {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

function buildExportUrl(format, { tab, search = '', type = 'all' }) {
  const params = new URLSearchParams({ tab });
  if (search) params.set('search', search);
  if (type && type !== 'all') params.set('type', type);
  return `/api/admin/agent-commission/export/${format}?${params.toString()}`;
}

export async function downloadAdminAgentCommissionExport(format, options) {
  const response = await adminFetch(buildExportUrl(format, options), {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || `agent-commission.${format}`;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchAdminAgentCommissionSettlements({ status = 'all', search = '' } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.set('status', status);
  if (search) params.set('search', search);
  const query = params.toString();
  const response = await adminFetch(
    `/api/admin/agent-commission/settlements${query ? `?${query}` : ''}`,
    { headers: getAdminAuthHeaders() },
  );
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminAgentCommissionSettlementDetails(id) {
  const response = await adminFetch(`/api/admin/agent-commission/settlements/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function generateAdminAgentCommissionSettlements(payload = {}) {
  const response = await adminFetch('/api/admin/agent-commission/settlements/generate', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function approveAdminAgentCommissionSettlement(id) {
  const response = await adminFetch(`/api/admin/agent-commission/settlements/${id}/approve`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({}),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function rejectAdminAgentCommissionSettlement(id) {
  const response = await adminFetch(`/api/admin/agent-commission/settlements/${id}/reject`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({}),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}
