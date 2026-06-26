import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminToast from '../../components/admin/AdminToast';
import SiteConfigurationTabs, {
  SiteConfigurationHeader,
} from '../../components/admin/SiteConfigurationTabs';
import {
  fetchAdminAppDownloadSettings,
  removeAdminAppApk,
  updateAdminAppDownloadSettings,
  uploadAdminAppApk,
} from '../../services/adminAppDownloadService';

function ToggleSwitch({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors',
        checked ? 'bg-emerald-500' : 'bg-slate-300',
        disabled ? 'opacity-50' : '',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}

export default function AdminAppDownloadPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [version, setVersion] = useState('');
  const [apkUrl, setApkUrl] = useState('/downloads/jowabuzz-app.apk');
  const [appSize, setAppSize] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [apkFile, setApkFile] = useState(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = useCallback((message, type = 'success') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const applySettings = useCallback((data) => {
    setSettings(data);
    setVersion(String(data?.version || ''));
    setApkUrl(String(data?.apkUrl || '/downloads/jowabuzz-app.apk'));
    setAppSize(String(data?.appSize || ''));
    setReleaseNotes(String(data?.releaseNotes || ''));
    setIsActive(Boolean(data?.isActive));
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    const result = await fetchAdminAppDownloadSettings();
    if (result.unauthorized) {
      navigate('/admin/login', { replace: true });
      return;
    }
    if (!result.success) {
      showToast(result.error || 'Failed to load settings', 'error');
      setLoading(false);
      return;
    }
    applySettings(result.settings);
    setLoading(false);
  }, [applySettings, navigate, showToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateAdminAppDownloadSettings({
      version: version.trim(),
      apkUrl: apkUrl.trim(),
      appSize: appSize.trim(),
      releaseNotes: releaseNotes.trim(),
      isActive,
    });
    setSaving(false);

    if (result.unauthorized) {
      navigate('/admin/login', { replace: true });
      return;
    }
    if (!result.success) {
      showToast(result.error || 'Failed to save settings', 'error');
      return;
    }

    applySettings(result.settings);
    showToast(result.message || 'Settings saved');
  };

  const handleUpload = async () => {
    if (!apkFile) {
      showToast('Select an APK file first', 'error');
      return;
    }

    setSaving(true);
    const result = await uploadAdminAppApk(apkFile);
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
    applySettings(result.settings);
    showToast(result.message || 'APK uploaded');
  };

  const handleRemoveApk = async () => {
    if (!window.confirm('Remove the uploaded APK file?')) return;

    setSaving(true);
    const result = await removeAdminAppApk();
    setSaving(false);

    if (result.unauthorized) {
      navigate('/admin/login', { replace: true });
      return;
    }
    if (!result.success) {
      showToast(result.error || 'Failed to remove APK', 'error');
      return;
    }

    applySettings(result.settings);
    showToast(result.message || 'APK removed');
  };

  const hasApk = Boolean(settings?.hasApk);

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="space-y-5">
        <SiteConfigurationHeader />
        <SiteConfigurationTabs />

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">App Download</h3>
          <p className="mt-1 text-sm text-slate-500">
            Manage the public Jowabuzz Mobile App download page at /download
          </p>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading app download settings...</div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="block text-sm font-medium text-slate-700">Active</span>
                  <span className="text-xs text-slate-500">Show download on public page when APK is available</span>
                </div>
                <ToggleSwitch checked={isActive} onChange={setIsActive} disabled={saving} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">App Version</span>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="e.g. 1.0.0"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
                    disabled={saving}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">App Size</span>
                  <input
                    type="text"
                    value={appSize}
                    onChange={(e) => setAppSize(e.target.value)}
                    placeholder="Auto-filled after upload"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
                    disabled={saving}
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">APK File URL</span>
                <input
                  type="text"
                  value={apkUrl}
                  onChange={(e) => setApkUrl(e.target.value)}
                  placeholder="/downloads/jowabuzz-app.apk"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
                  disabled={saving}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Release Notes</span>
                <textarea
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  rows={5}
                  placeholder="What's new in this version..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
                  disabled={saving}
                />
              </label>

              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <span className="mb-2 block text-sm font-medium text-slate-700">APK Upload</span>
                <input
                  type="file"
                  accept=".apk,application/vnd.android.package-archive"
                  onChange={(e) => setApkFile(e.target.files?.[0] || null)}
                  disabled={saving}
                  className="block w-full text-sm text-slate-600"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={saving || !apkFile}
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Upload APK
                  </button>
                  {hasApk ? (
                    <button
                      type="button"
                      onClick={handleRemoveApk}
                      disabled={saving}
                      className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
                    >
                      Remove APK
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Saved to public/downloads/jowabuzz-app.apk · Max 150 MB
                  {hasApk ? ' · APK is currently on server' : ' · No APK uploaded yet'}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
