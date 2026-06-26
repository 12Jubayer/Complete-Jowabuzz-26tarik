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

export const fetchAdminAffiliateUsers = () => apiGet('/api/admin/affiliate/users');
export const createAdminAffiliate = (payload) => apiPost('/api/admin/affiliate/users', payload);
export const approveAdminAffiliate = (affiliateId) =>
  apiPost('/api/admin/affiliate/approve', { affiliateId, status: 'approved' });
export const rejectAdminAffiliate = (affiliateId) =>
  apiPost('/api/admin/affiliate/reject', { affiliateId, status: 'rejected' });
export const blockAdminAffiliate = (affiliateId) =>
  apiPost('/api/admin/affiliate/block', { affiliateId, status: 'blocked' });
export const updateAdminAffiliateCommission = (affiliateId, commissionPercent) =>
  apiPost('/api/admin/affiliate/commission', { affiliateId, commissionPercent });
export const updateGlobalCommission = (commissionPercent) =>
  apiPost('/api/admin/affiliate/commission/global', { commissionPercent });
export const fetchCommissionSettings = () => apiGet('/api/admin/affiliate/commission/settings');
export const updateSettlementSettings = (payload) =>
  apiPost('/api/admin/affiliate/settlement/settings', payload);
export const fetchAdminSettlements = () => apiGet('/api/admin/affiliate/settlements');
export const runAdminSettlement = (payload) => apiPost('/api/admin/affiliate/settle', payload);
export const completeAdminSettlement = (settlementId, source = 'period') =>
  apiPost('/api/admin/affiliate/settlement/complete', { settlementId, source });
export const rejectAdminSettlement = (settlementId, source = 'period') =>
  apiPost('/api/admin/affiliate/settlement/reject', { settlementId, source });
export const changeAffiliatePassword = (payload) =>
  apiPost('/api/admin/affiliate/change-password', payload);
export const fetchAdminWithdrawRequests = () => apiGet('/api/admin/affiliate/withdraw-requests');
export const updateWithdrawRequestStatus = (requestId, status) =>
  apiPost('/api/admin/affiliate/withdraw-requests/status', { requestId, status });
export const fetchReferralStatistics = () => apiGet('/api/admin/affiliate/referral-statistics');
