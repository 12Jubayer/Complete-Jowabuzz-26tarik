const DEFAULT_FEATURES = [
  'Fast & Smooth Experience',
  'Secure Account Access',
  'Real-time Balance Sync',
  'Instant Notifications',
  'Mobile Optimized Interface',
  'Easy Navigation',
  '24/7 Customer Support',
];

const DEFAULT_APP = {
  appName: 'Jowabuzz Mobile App',
  version: '1.0.0',
  appSize: '',
  releaseNotes: '',
  downloadUrl: null,
  available: false,
  comingSoonMessage: 'App coming soon',
  features: DEFAULT_FEATURES,
};

export const DEFAULT_APK_URL = '/downloads/jowabuzz-app.apk';

export function isAndroidDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
}

export async function fetchAppDownloadInfo() {
  try {
    const response = await fetch('/api/site-config/app-download');
    if (!response.ok) {
      return { success: false, app: DEFAULT_APP, error: 'Failed to load app info' };
    }
    const body = await response.json();
    return {
      success: Boolean(body.success),
      app: body.app || DEFAULT_APP,
    };
  } catch {
    return { success: false, app: DEFAULT_APP, error: 'Network error' };
  }
}

function buildApkUrl(downloadUrl = DEFAULT_APK_URL, version = '') {
  const safeUrl = String(downloadUrl || DEFAULT_APK_URL).trim() || DEFAULT_APK_URL;
  const absolute = safeUrl.startsWith('http')
    ? new URL(safeUrl)
    : new URL(safeUrl.startsWith('/') ? safeUrl : `/${safeUrl}`, window.location.origin);
  absolute.searchParams.set('v', String(version || Date.now()));
  return absolute.toString();
}

export function triggerInstantApkDownload(app) {
  const downloadUrl = app?.downloadUrl || DEFAULT_APK_URL;
  const url = buildApkUrl(downloadUrl, app?.version);
  window.location.assign(url);
  return { success: true, url };
}

export async function attemptApkDownload(app) {
  if (app?.available) {
    return triggerInstantApkDownload(app);
  }

  return {
    success: false,
    message: app?.comingSoonMessage || 'App coming soon',
  };
}

let globalInstallPrompt = null;
const installPromptListeners = new Set();

function notifyInstallPromptListeners() {
  installPromptListeners.forEach((listener) => listener(globalInstallPrompt));
}

export function initPwaInstallListener() {
  if (typeof window === 'undefined') return;
  if (window.__jowabuzzPwaInstallInit) return;

  window.__jowabuzzPwaInstallInit = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    globalInstallPrompt = event;
    notifyInstallPromptListeners();
  });

  window.addEventListener('appinstalled', () => {
    globalInstallPrompt = null;
    notifyInstallPromptListeners();
  });
}

export function subscribePwaInstall(listener) {
  initPwaInstallListener();
  listener(globalInstallPrompt);
  installPromptListeners.add(listener);
  return () => installPromptListeners.delete(listener);
}

export function getPwaInstallPrompt() {
  initPwaInstallListener();
  return globalInstallPrompt;
}

export async function triggerPwaInstall() {
  initPwaInstallListener();

  if (globalInstallPrompt) {
    globalInstallPrompt.prompt();
    await globalInstallPrompt.userChoice;
    globalInstallPrompt = null;
    notifyInstallPromptListeners();
    return { success: true, mode: 'prompt' };
  }

  return { success: true, mode: 'guide' };
}

export default fetchAppDownloadInfo;
