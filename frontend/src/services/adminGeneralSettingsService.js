import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminGeneralSettings() {
  const response = await adminFetch('/api/admin/general-settings', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminGeneralSettingsSection(section, payload) {
  const response = await adminFetch(`/api/admin/general-settings/${section}`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchPublicChatSettings() {
  const response = await fetch('/api/site-config/chat', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to load chat settings');
  return response.json();
}

export async function fetchPublicDepositWithdrawRules() {
  const response = await fetch('/api/site-config/deposit-withdraw-rules', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to load deposit and withdraw rules');
  return response.json();
}
