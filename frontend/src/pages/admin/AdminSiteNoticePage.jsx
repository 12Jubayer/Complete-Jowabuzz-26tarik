import { useCallback, useEffect, useState } from 'react';
import AdminToast from '../../components/admin/AdminToast';
import SiteConfigurationTabs, {
  SiteConfigurationHeader,
} from '../../components/admin/SiteConfigurationTabs';
import {
  fetchAdminNoticeConfig,
  updateAdminNoticeConfig,
} from '../../services/adminSiteConfigService';

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

export default function AdminSiteNoticePage() {
  const [enabled, setEnabled] = useState(true);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchAdminNoticeConfig()
      .then((data) => {
        if (!active) return;
        setEnabled(Boolean(data.enabled));
        setText(String(data.text || ''));
      })
      .catch((error) => showToast(error.message || 'Failed to load notice settings'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAdminNoticeConfig({ enabled, text });
      showToast('Notice updated successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to save notice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="space-y-5">
        <SiteConfigurationHeader />
        <SiteConfigurationTabs />

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Marquee / Notice Bar</h3>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading notice settings...</div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <span className="text-sm font-medium text-slate-700">Show notice on site</span>
                <ToggleSwitch checked={enabled} onChange={setEnabled} disabled={saving} />
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Notice Text</span>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={5}
                  maxLength={2000}
                  disabled={saving}
                  className="admin-filter-control w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none"
                  placeholder="Enter notice text..."
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
