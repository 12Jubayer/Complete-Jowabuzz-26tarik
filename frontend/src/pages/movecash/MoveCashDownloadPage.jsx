import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  detectMoveCashPlatform,
  fetchMoveCashDownloadInfo,
  promptMoveCashInstall,
  registerMoveCashServiceWorker,
} from '../../services/movecashService';

function setPrivatePageMeta() {
  document.title = 'JBCash App';
  const robots = document.querySelector('meta[name="robots"]');
  if (robots) {
    robots.setAttribute('content', 'noindex, nofollow');
  } else {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
  }

  let manifest = document.querySelector('link[rel="manifest"][data-movecash="1"]');
  if (!manifest) {
    manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.setAttribute('data-movecash', '1');
    manifest.href = '/movecash-manifest.webmanifest';
    document.head.appendChild(manifest);
  }

  let theme = document.querySelector('meta[name="theme-color"][data-movecash="1"]');
  if (!theme) {
    theme = document.createElement('meta');
    theme.name = 'theme-color';
    theme.content = '#059669';
    theme.setAttribute('data-movecash', '1');
    document.head.appendChild(theme);
  }

  const appleMeta = [
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-title', content: 'JBCash' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'mobile-web-app-capable', content: 'yes' },
  ];

  appleMeta.forEach(({ name, content }) => {
    let tag = document.querySelector(`meta[name="${name}"][data-movecash="1"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = name;
      tag.content = content;
      tag.setAttribute('data-movecash', '1');
      document.head.appendChild(tag);
    }
  });

  let appleIcon = document.querySelector('link[rel="apple-touch-icon"][data-movecash="1"]');
  if (!appleIcon) {
    appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    appleIcon.href = '/movecash/icon-192.png';
    appleIcon.setAttribute('data-movecash', '1');
    document.head.appendChild(appleIcon);
  }
}

function installGuideSteps(platform) {
  if (platform === 'ios') {
    return [
      'Open this page in Safari (iPhone/iPad).',
      'Tap the Share button at the bottom.',
      'Choose Add to Home Screen.',
      'Tap Add, then open JBCash from home screen.',
    ];
  }

  if (platform === 'android') {
    return [
      'Use Chrome browser on Android.',
      'Tap Install App (or menu → Install app / Add to Home screen).',
      'Allow install when prompted.',
      'Open JBCash from home screen and login.',
    ];
  }

  return [
    'Use Chrome, Edge or Safari on your phone.',
    'Tap Install App or use browser menu → Install / Add to Home screen.',
    'Open JBCash from home screen and login.',
  ];
}

function formatExpiry(value) {
  if (!value) return 'No expiry';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No expiry';
  return date.toLocaleString();
}

export default function MoveCashDownloadPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installMessage, setInstallMessage] = useState('');
  const platform = useMemo(() => detectMoveCashPlatform(), []);
  const guideSteps = useMemo(() => installGuideSteps(platform), [platform]);

  const qrUrl = useMemo(() => {
    if (!info?.downloadUrl) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(info.downloadUrl)}`;
  }, [info?.downloadUrl]);

  useEffect(() => {
    setPrivatePageMeta();
    registerMoveCashServiceWorker();
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      const result = await fetchMoveCashDownloadInfo(token);
      if (!active) return;

      if (!result.success) {
        setError(result.error || 'Invalid or Expired Download Link');
        setInfo(null);
      } else {
        setInfo(result.data);
      }
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [token]);

  const handleInstall = async () => {
    if (info?.apk?.available && info.apk.url) {
      window.location.href = info.apk.url;
      return;
    }

    const result = await promptMoveCashInstall(installPrompt);
    if (result.outcome === 'accepted') {
      setInstallMessage('JBCash installed successfully. Open the app from your home screen.');
      return;
    }

    if (result.outcome === 'unavailable') {
      if (platform === 'ios') {
        setInstallMessage('On iPhone: Safari → Share → Add to Home Screen.');
      } else if (platform === 'android') {
        setInstallMessage('On Android: Chrome menu (⋮) → Install app / Add to Home screen.');
      } else {
        setInstallMessage('Use browser menu → Install app / Add to Home screen.');
      }
      return;
    }

    setInstallMessage('Install dismissed. You can try again or use Add to Home screen from browser menu.');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <p className="text-sm text-slate-300">Loading JBCash...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 text-center">
          <h1 className="text-xl font-semibold text-red-300">Invalid or Expired Download Link</h1>
          <p className="mt-3 text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-emerald-500/20 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-black p-2">
            <img
              src="/logos/jbcash-logo.png"
              alt="JBCash"
              className="h-16 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold">JBCash App</h1>
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
          <p>Install JBCash to access agent login, balance, top-up, withdraw, commission and reports.</p>
          <p>
            Link expiry:
            {' '}
            <span className="font-medium text-emerald-200">{formatExpiry(info?.expiresAt)}</span>
          </p>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleInstall}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            {info?.apk?.available ? 'Download APK' : 'Install App'}
          </button>
        </div>

        {installMessage && (
          <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
            {installMessage}
          </p>
        )}

        {qrUrl && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <img src={qrUrl} alt="JBCash QR code" className="rounded-xl bg-white p-2" />
            <p className="text-xs text-slate-400">Scan to open this private install page</p>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-slate-700 p-4 text-xs text-slate-400">
          <p className="font-semibold text-slate-200">
            Install guide
            {platform === 'ios' ? ' (iPhone/iPad)' : platform === 'android' ? ' (Android)' : ''}
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            {guideSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
            <li>Login with your existing agent User ID and password.</li>
            <li>Share this link only via Telegram private message or trusted group.</li>
          </ol>
        </div>

        <div className="mt-4 text-center">
          <a
            href="/agent-app?from=movecash"
            className="text-xs font-medium text-emerald-300 underline-offset-2 hover:underline"
          >
            Open in browser without installing
          </a>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          This page is private. Do not publish on website, footer, sidebar or sitemap.
        </p>
      </div>
    </div>
  );
}
