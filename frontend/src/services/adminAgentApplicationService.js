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

export async function fetchAdminAgentApplications(filters = {}) {
  const response = await adminFetch(`/api/admin/agent-applications${buildQuery(filters)}`, {
    headers: getAdminAuthHeaders(),
  });

  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminAgentApplication(id) {
  const response = await adminFetch(`/api/admin/agent-applications/${id}`, {
    headers: getAdminAuthHeaders(),
  });

  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminAgentApplicationStatus(id, status) {
  const response = await adminFetch(`/api/admin/agent-applications/${id}/status`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) await parseError(response);
  return response.json();
}

export async function deleteAdminAgentApplication(id) {
  const response = await adminFetch(`/api/admin/agent-applications/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });

  if (!response.ok) await parseError(response);
  return response.json();
}
