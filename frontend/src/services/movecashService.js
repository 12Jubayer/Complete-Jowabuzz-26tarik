function isMainSiteHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase().replace(/^www\./, '');
  return host === 'jowabuzz.com';
}

export async function fetchMoveCashDownloadInfo(token) {
  const safeToken = String(token || '').trim();
  if (!safeToken) {
    return { success: false, error: 'Invalid or Expired Download Link' };
  }

  try {
    const response = await fetch(`/api/movecash/download/${encodeURIComponent(safeToken)}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Invalid or Expired Download Link',
      };
    }

    return { success: true, data };
  } catch {
    return {
      success: false,
      error: 'Unable to connect to server. Please try again.',
    };
  }
}

export function detectMoveCashPlatform() {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

export async function registerMoveCashServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  if (isMainSiteHost()) return null;

  try {
    return await navigator.serviceWorker
      .register('/agent/movecash-sw.js', { scope: '/agent/' })
      .catch(() => null);
  } catch {
    return null;
  }
}

export async function promptMoveCashInstall(deferredPrompt) {
  if (!deferredPrompt) return { outcome: 'unavailable' };
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  return { outcome: choice?.outcome || 'dismissed' };
}
