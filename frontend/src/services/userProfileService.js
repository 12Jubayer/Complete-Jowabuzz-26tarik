import { getUserToken } from '../utils/userAuth';

function getAuthHeaders() {
  const token = getUserToken();
  if (!token) throw new Error('Please login again');
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
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

async function apiPost(path, payload = {}) {
  const response = await fetch(path, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (response.status === 401) throw new Error('Session expired. Please login again.');
  if (!response.ok) await parseError(response);
  return response.json();
}

export const fetchUserProfile = () => apiGet('/api/user/profile');
export const fetchUserWallet = () => apiGet('/api/user/wallet');
export const fetchUserTransactions = (type = 'all') =>
  apiGet(`/api/user/transactions?type=${encodeURIComponent(type)}`);
export const fetchUserTurnover = () => apiGet('/api/user/turnover');
export const fetchUserBonus = () => apiGet('/api/user/bonus');
export const fetchUserBonusStatus = () => apiGet('/api/user/bonus/status');
export const fetchBettingRecords = () => apiGet('/api/user/betting-records');
export const fetchUserMessages = () => apiGet('/api/user/messages');
export const fetchReferralInfo = () => apiGet('/api/user/referral');
export const fetchBankDetails = () => apiGet('/api/user/bank-details');
export const submitDepositRequest = (payload) => apiPost('/api/user/deposit-request', payload);
export const submitWithdrawRequest = (payload) => apiPost('/api/user/withdraw-request', payload);
export const requestUserWithdrawOtp = (amount) =>
  apiPost('/api/user/withdraw/request-otp', { amount });
export const confirmUserWithdraw = (payload) => apiPost('/api/user/withdraw/confirm', payload);
export const submitChangePassword = (payload) => apiPost('/api/user/change-password', payload);
export const submitProfileUpdateRequest = (payload) =>
  apiPost('/api/user/update-profile-request', payload);
export const saveBankDetails = (payload) => apiPost('/api/user/bank-details', payload);
