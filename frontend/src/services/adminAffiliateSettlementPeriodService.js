import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

async function apiGet(path) {
  const response = await adminFetch(path, { headers: getAdminAuthHeaders() });
  if (!response.ok) await parseError(response);
  return response.json();
}

async function apiPost(path, payload = {}) {
  const response = await adminFetch(path, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

async function apiPut(path, payload = {}) {
  const response = await adminFetch(path, {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export const fetchSettlementPeriods = () => apiGet('/api/admin/affiliate/settlement-periods');
export const createSettlementPeriod = (payload) => apiPost('/api/admin/affiliate/settlement-periods', payload);
export const updateSettlementPeriod = (id, payload) => apiPut(`/api/admin/affiliate/settlement-periods/${id}`, payload);
export const activateSettlementPeriod = (id) => apiPost(`/api/admin/affiliate/settlement-periods/${id}/activate`);
export const runActivePeriodSettlement = () => apiPost('/api/admin/affiliate/settlement-periods/run');
