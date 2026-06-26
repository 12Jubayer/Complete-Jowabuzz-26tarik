import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import SiteConfigurationTabs, {
  SiteConfigurationHeader,
} from '../../components/admin/SiteConfigurationTabs';
import {
  fetchAdminBranding,
  updateAdminBranding,
  uploadAdminFavicon,
  uploadAdminLogo,
} from '../../services/adminSiteConfigService';

const EMPTY_BRANDING = {
  siteName: '',
  currency: '',
  logoUrl: '',
  faviconUrl: '',
};

function AssetField({
  label,
  urlValue,
  onUrlChange,
  onUpload,
  uploading,
  disabled,
  placeholder,
  previewAlt,
}) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={urlValue}
            onChange={(event) => onUrlChange(event.target.value)}
            disabled={disabled || uploading}
            className="admin-filter-control min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={onUpload}
            disabled={disabled || uploading}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            aria-label={`Upload ${label}`}
          >
            <Upload size={18} />
          </button>
        </div>
      </label>

      {urlValue ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4">
          <img
            src={urlValue}
            alt={previewAlt}
            className="mx-auto max-h-24 max-w-full object-contain"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function AdminSiteLogoIconPage() {
  const [form, setForm] = useState(EMPTY_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState('');
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');
  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchAdminBranding()
      .then((data) => {
        if (!active) return;
        setForm({
          siteName: data.siteName || '',
          currency: data.currency || '',
          logoUrl: data.logoUrl || '',
          faviconUrl: data.faviconUrl || '',
        });
      })
      .catch((error) => showToast(error.message || 'Failed to load branding settings'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleLogoSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingField('logo');
    try {
      const result = await uploadAdminLogo(file);
      updateField('logoUrl', result.logoUrl);
      showToast('Logo uploaded successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to upload logo');
    } finally {
      setUploadingField('');
    }
  };

  const handleFaviconSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingField('favicon');
    try {
      const result = await uploadAdminFavicon(file);
      updateField('faviconUrl', result.faviconUrl);
      showToast('Favicon uploaded successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to upload favicon');
    } finally {
      setUploadingField('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateAdminBranding(form);
      setForm({
        siteName: result.siteName || '',
        currency: result.currency || '',
        logoUrl: result.logoUrl || '',
        faviconUrl: result.faviconUrl || '',
      });
      showToast('Branding updated successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || Boolean(uploadingField);

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <input
        ref={logoInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleLogoSelected}
      />
      <input
        ref={faviconInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.ico,image/jpeg,image/png,image/webp,image/x-icon"
        className="hidden"
        onChange={handleFaviconSelected}
      />

      <div className="space-y-5">
        <SiteConfigurationHeader />
        <SiteConfigurationTabs />

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Logo & Favicon</h3>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading branding settings...</div>
          ) : (
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Site Name</span>
                <input
                  type="text"
                  value={form.siteName}
                  onChange={(event) => updateField('siteName', event.target.value)}
                  disabled={busy}
                  className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  placeholder="JowaBuzz"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Currency</span>
                <input
                  type="text"
                  value={form.currency}
                  onChange={(event) => updateField('currency', event.target.value)}
                  disabled={busy}
                  className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                  placeholder="BDT"
                />
              </label>

              <AssetField
                label="Logo URL"
                urlValue={form.logoUrl}
                onUrlChange={(value) => updateField('logoUrl', value)}
                onUpload={() => logoInputRef.current?.click()}
                uploading={uploadingField === 'logo'}
                disabled={busy}
                placeholder="https://..."
                previewAlt="Logo preview"
              />

              <AssetField
                label="Favicon URL"
                urlValue={form.faviconUrl}
                onUrlChange={(value) => updateField('faviconUrl', value)}
                onUpload={() => faviconInputRef.current?.click()}
                uploading={uploadingField === 'favicon'}
                disabled={busy}
                placeholder="https://..."
                previewAlt="Favicon preview"
              />

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={busy}
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
