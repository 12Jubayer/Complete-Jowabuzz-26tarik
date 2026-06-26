import { getAffiliateToken } from '../utils/affiliateAuth';

function getAuthHeaders() {
  const token = getAffiliateToken();
  if (!token) throw new Error('Affiliate session expired. Please login again.');
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

async function apiGet(path) {
  const response = await fetch(path, { headers: getAuthHeaders() });
  if (response.status === 401) throw new Error('Session expired. Please login again.');
  if (!response.ok) await parseError(response);
  return response.json();
}

async function apiPost(path, payload) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (response.status === 401) throw new Error('Session expired. Please login again.');
  if (!response.ok) await parseError(response);
  return response.json();
}

async function apiPut(path, payload) {
  const response = await fetch(path, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (response.status === 401) throw new Error('Session expired. Please login again.');
  if (!response.ok) await parseError(response);
  return response.json();
}

export const fetchAffiliateDashboard = () => apiGet('/api/affiliate/dashboard');
export const fetchAffiliateReferrals = () => apiGet('/api/affiliate/referrals');
export const fetchAffiliateCommission = () => apiGet('/api/affiliate/commission');
export const fetchAffiliateSettlements = () => apiGet('/api/affiliate/settlements');
export const fetchAffiliateProfile = () => apiGet('/api/affiliate/profile');
export const updateAffiliateSettlementUser = (settlementUserId) =>
  apiPut('/api/affiliate/profile/settlement-user', { settlementUserId });
export const fetchAffiliateWithdrawHistory = () => apiGet('/api/affiliate/withdraw/history');
export const submitAffiliateWithdraw = (payload) => apiPost('/api/affiliate/withdraw', payload);
