import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminAgents(filters = {}) {
  const response = await adminFetch(`/api/admin/agents${buildQuery(filters)}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminAgentInfo(id) {
  const response = await adminFetch(`/api/admin/agents/${id}/info`, {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function createAdminAgent(payload) {
  const response = await adminFetch('/api/admin/agents', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminAgentStatus(id, status) {
  const response = await adminFetch(`/api/admin/agents/${id}/status`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ status }),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function adjustAdminAgentBalance(id, payload) {
  const response = await adminFetch(`/api/admin/agents/${id}/adjust-balance`, {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function deleteAdminAgent(id) {
  const response = await adminFetch(`/api/admin/agents/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export default fetchAdminAgents;
