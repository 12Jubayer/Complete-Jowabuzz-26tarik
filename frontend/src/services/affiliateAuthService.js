import { clearAffiliateSession, setAffiliateSession } from '../utils/affiliateAuth';

export async function loginAffiliate({ identifier, password }) {
  try {
    const response = await fetch('/api/affiliate/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { success: false, error: body.error || 'Login failed', status: body.status };
    }

    setAffiliateSession({ token: body.token, affiliate: body.affiliate });

    return { success: true, affiliate: body.affiliate };
  } catch {
    return { success: false, error: 'Unable to connect to server' };
  }
}

export async function registerAffiliate({ name, phone, email, password, ref, settlementUserId }) {
  try {
    const response = await fetch('/api/affiliate/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email, password, ref, settlementUserId }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { success: false, error: body.error || 'Registration failed' };
    }

    return {
      success: true,
      message: body.message || 'Affiliate signup submitted successfully. Please wait for admin approval.',
      affiliate: body.affiliate || null,
    };
  } catch {
    return { success: false, error: 'Unable to connect to server' };
  }
}

export async function logoutAffiliate() {
  clearAffiliateSession();
}
