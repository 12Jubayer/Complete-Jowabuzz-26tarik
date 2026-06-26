import { useCallback, useEffect, useState } from 'react';
import AdminToast from '../../components/admin/AdminToast';
import SiteConfigurationTabs, {
  SiteConfigurationHeader,
} from '../../components/admin/SiteConfigurationTabs';
import {
  fetchAdminSocialLinks,
  updateAdminSocialLinks,
} from '../../services/adminSiteConfigService';

const FIELDS = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { key: 'telegram', label: 'Telegram', placeholder: 'https://t.me/Jowabuzz' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/...' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/...' },
];

const EMPTY_LINKS = {
  facebook: '',
  telegram: '',
  whatsapp: '',
  instagram: '',
  youtube: '',
};

export default function AdminSiteSocialLinksPage() {
  const [links, setLinks] = useState(EMPTY_LINKS);
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
    fetchAdminSocialLinks()
      .then((data) => {
        if (!active) return;
        setLinks({
          facebook: data.facebook || '',
          telegram: data.telegram || '',
          whatsapp: data.whatsapp || '',
          instagram: data.instagram || '',
          youtube: data.youtube || '',
        });
      })
      .catch((error) => showToast(error.message || 'Failed to load social links'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  const updateLink = (key, value) => {
    setLinks((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateAdminSocialLinks(links);
      setLinks({
        facebook: result.facebook || '',
        telegram: result.telegram || '',
        whatsapp: result.whatsapp || '',
        instagram: result.instagram || '',
        youtube: result.youtube || '',
      });
      showToast('Social links updated successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to save social links');
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
          <h3 className="text-lg font-semibold text-slate-900">Social Media Links</h3>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading social links...</div>
          ) : (
            <div className="mt-5 space-y-4">
              {FIELDS.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    {field.label}
                  </span>
                  <input
                    type="url"
                    value={links[field.key]}
                    onChange={(event) => updateLink(field.key, event.target.value)}
                    disabled={saving}
                    className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    placeholder={field.placeholder}
                  />
                </label>
              ))}

              <div className="flex justify-end pt-2">
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
