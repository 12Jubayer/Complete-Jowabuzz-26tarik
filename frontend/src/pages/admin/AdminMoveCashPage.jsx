import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminToast from '../../components/admin/AdminToast';
import {
  fetchAdminMoveCashSettings,
  regenerateMoveCashLink,
  removeMoveCashApk,
  updateMoveCashExpiry,
  uploadMoveCashApk,
} from '../../services/adminMoveCashService';

function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export default function AdminMoveCashPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [expiresAtInput, setExpiresAtInput] = useState('');
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');
  const [apkFile, setApkFile] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    const result = await fetchAdminMoveCashSettings();
    if (result.unauthorized) {
      navigate('/admin/login', { replace: true });
      return;
    }
    if (!result.success) {
      showToast(result.error || 'Failed to load settings', 'error');
      setLoading(false);
      return;
    }
    setSettings(result.settings);
    setExpiresAtInput(toDatetimeLocalValue(result.settings?.link?.expiresAt));
    setLoading(false);
  }, [navigate, showToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const qrUrl = useMemo(() => {
    const url = settings?.link?.downloadUrl;
    if (!url) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;
  }, [settings?.link?.downloadUrl]);

  const handleCopy = async () => {
    const url = settings?.link?.downloadUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Private download link copied');
    } catch {
      showToast('Copy failed. Select and copy manually.', 'error');
    }
  };

  const handleRegenerate = async () => {
    setSaving(true);
    const result = await regenerateMoveCashLink({
      expiresAt: fromDatetimeLocalValue(expiresAtInput),
    });
    setSaving(false);

    if (result.unauthorized) {
      navigate('/admin/login', { replace: true });
      return;
    }
    if (!result.success) {
      showToast(result.error || 'Failed to regenerate link', 'error');
      return;
    }

    showToast(result.message || 'Link regenerated');
    await loadSettings();
  };

  const handleSaveExpiry = async () => {
    setSaving(true);
    const result = await updateMoveCashExpiry({
      expiresAt: fromDatetimeLocalValue(expiresAtInput),
    });
    setSaving(false);

    if (result.unauthorized) {
      navigate('/admin/login', { replace: true });
      return;
    }
    if (!result.success) {
      showToast(result.error || 'Failed to update expiry', 'error');
      return;
    }

    showToast(result.message || 'Expiry updated');
    await loadSettings();
  };

  const handleUploadApk = async () => {
    if (!apkFile) {
      showToast('Select an APK file first', 'error');
      return;
    }

    setSaving(true);
    const result = await uploadMoveCashApk(apkFile);
    setSaving(false);

    if (result.unauthorized) {
      navigate('/admin/login', { replace: true });
      return;
    }
    if (!result.success) {
      showToast(result.error || 'Failed to upload APK', 'error');
      return;
    }

    setApkFile(null);
    showToast(result.message || 'APK uploaded');
    await loadSettings();
  };

  const handleRemoveApk = async () => {
    setSaving(true);
    const result = await removeMoveCashApk();
    setSaving(false);

    if (result.unauthorized) {
      navigate('/admin/login', { replace: true });
      return;
    }
    if (!result.success) {
      showToast(result.error || 'Failed to remove APK', 'error');
      return;
    }

    showToast(result.message || 'APK removed');
    await loadSettings();
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading JBCash settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminToast message={toast} type={toastType} />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">JBCash App</h1>
        <p className="mt-1 text-sm text-slate-500">
          Private install link for the existing Agent Panel mobile app. Share only via Telegram.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Private download link</h2>
          <p className="mt-1 text-xs text-slate-500">
            Status:
            {' '}
            <span className="font-medium text-emerald-600">{settings?.link?.status || 'active'}</span>
          </p>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 break-all">
            {settings?.link?.downloadUrl || '—'}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Copy link
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleRegenerate}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Regenerate link
            </button>
          </div>

          <div className="mt-4">
            <label className="text-xs font-medium text-slate-600">Expiry date (optional)</label>
            <input
              type="datetime-local"
              value={expiresAtInput}
              onChange={(e) => setExpiresAtInput(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveExpiry}
              className="mt-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Save expiry
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">QR code</h2>
          <p className="mt-1 text-xs text-slate-500">For Telegram sharing or private distribution.</p>
          {qrUrl ? (
            <img src={qrUrl} alt="JBCash private link QR" className="mt-4 rounded-xl border border-slate-200 bg-white p-2" />
          ) : (
            <p className="mt-4 text-sm text-slate-500">No active link yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">APK (future ready)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload APK to show Download APK on the private install page. Without APK, users get PWA Install.
        </p>

        {settings?.apk?.available ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p>
              Current APK:
              {' '}
              <span className="font-medium">{settings.apk.filename}</span>
            </p>
            <p className="mt-1 break-all text-xs">{settings.apk.url}</p>
            <button
              type="button"
              disabled={saving}
              onClick={handleRemoveApk}
              className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              Remove APK
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No APK uploaded.</p>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            onChange={(e) => setApkFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600"
          />
          <button
            type="button"
            disabled={saving || !apkFile}
            onClick={handleUploadApk}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            Upload / Replace APK
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Install instructions</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
          {(settings?.instructions || []).map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li>Do not add this link to homepage, footer, sidebar or sitemap.</li>
          <li>Agents use existing login — no separate JBCash account.</li>
        </ul>
      </div>
    </div>
  );
}
