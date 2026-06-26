import { adminFetch, getAdminAuthHeaders } from '../utils/adminApi';
import { cancelAdminBonusProgress, fetchAdminBonusProgress } from './adminBonusProgressService';

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchAdminDepositBonusRules() {
  const response = await adminFetch('/api/admin/deposit-bonus', {
    headers: getAdminAuthHeaders(),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function createAdminDepositBonusRule(payload) {
  const response = await adminFetch('/api/admin/deposit-bonus', {
    method: 'POST',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminDepositBonusRule(id, payload) {
  const response = await adminFetch(`/api/admin/deposit-bonus/${id}`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function deleteAdminDepositBonusRule(id) {
  const response = await adminFetch(`/api/admin/deposit-bonus/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(true),
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchAdminDepositBonusUsers(search = '') {
  const result = await fetchAdminBonusProgress(search, 'deposit_balance');
  return { success: true, accounts: result.records || [] };
}

export async function cancelAdminDepositBonusUser(id) {
  return cancelAdminBonusProgress(id);
}

export async function fetchSiteActiveDepositBonus() {
  const response = await fetch('/api/site/active-deposit-bonus', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to load deposit bonus offers');
  return response.json();
}
