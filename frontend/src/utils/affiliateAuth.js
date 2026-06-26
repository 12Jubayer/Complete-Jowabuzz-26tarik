const AFFILIATE_TOKEN_KEY = 'affiliateToken';
const AFFILIATE_USER_KEY = 'affiliateUser';

export function getAffiliateToken() {
  return localStorage.getItem(AFFILIATE_TOKEN_KEY);
}

export function getCurrentAffiliate() {
  try {
    const raw = localStorage.getItem(AFFILIATE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAffiliateSession({ token, affiliate }) {
  localStorage.setItem(AFFILIATE_TOKEN_KEY, token);
  localStorage.setItem(AFFILIATE_USER_KEY, JSON.stringify(affiliate));
}

export function clearAffiliateSession() {
  localStorage.removeItem(AFFILIATE_TOKEN_KEY);
  localStorage.removeItem(AFFILIATE_USER_KEY);
}

export function isAffiliateAuthenticated() {
  return !!getAffiliateToken() && !!getCurrentAffiliate();
}
