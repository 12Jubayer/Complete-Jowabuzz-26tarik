import { getAdminToken } from '../utils/adminAuth';

function authHeaders(extra = {}) {
  const token = getAdminToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function parseJson(response) {
  return response.json().catch(() => ({}));
}

export async function fetchAdminMoveCashSettings() {
  try {
    const response = await fetch('/api/admin/movecash', {
      headers: authHeaders(),
    });
    const data = await parseJson(response);

    if (response.status === 401) {
      return { success: false, unauthorized: true, error: 'Session expired. Please login again.' };
    }

    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to load JBCash settings' };
    }

    return { success: true, settings: data.settings };
  } catch {
    return { success: false, error: 'Unable to connect to server. Please try again.' };
  }
}

export async function regenerateMoveCashLink({ expiresAt = null } = {}) {
  try {
    const response = await fetch('/api/admin/movecash/regenerate-link', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ expiresAt }),
    });
    const data = await parseJson(response);

    if (response.status === 401) {
      return { success: false, unauthorized: true, error: 'Session expired. Please login again.' };
    }

    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to regenerate link' };
    }

    return { success: true, link: data.link, message: data.message };
  } catch {
    return { success: false, error: 'Unable to connect to server. Please try again.' };
  }
}

export async function updateMoveCashExpiry({ expiresAt = null } = {}) {
  try {
    const response = await fetch('/api/admin/movecash/expiry', {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ expiresAt }),
    });
    const data = await parseJson(response);

    if (response.status === 401) {
      return { success: false, unauthorized: true, error: 'Session expired. Please login again.' };
    }

    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to update expiry' };
    }

    return { success: true, link: data.link, message: data.message };
  } catch {
    return { success: false, error: 'Unable to connect to server. Please try again.' };
  }
}

export async function uploadMoveCashApk(file) {
  try {
    const formData = new FormData();
    formData.append('apk', file);

    const response = await fetch('/api/admin/movecash/apk', {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });
    const data = await parseJson(response);

    if (response.status === 401) {
      return { success: false, unauthorized: true, error: 'Session expired. Please login again.' };
    }

    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to upload APK' };
    }

    return { success: true, apk: data.apk, message: data.message };
  } catch {
    return { success: false, error: 'Unable to connect to server. Please try again.' };
  }
}

export async function removeMoveCashApk() {
  try {
    const response = await fetch('/api/admin/movecash/apk', {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await parseJson(response);

    if (response.status === 401) {
      return { success: false, unauthorized: true, error: 'Session expired. Please login again.' };
    }

    if (!response.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to remove APK' };
    }

    return { success: true, apk: data.apk, message: data.message };
  } catch {
    return { success: false, error: 'Unable to connect to server. Please try again.' };
  }
}
