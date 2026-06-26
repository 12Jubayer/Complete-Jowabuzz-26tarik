import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import {
  createAdminPopupBanner,
  deleteAdminPopupBanner,
  fetchAdminPopupBanners,
  updateAdminPopupBanner,
} from '../../services/adminPopupBannerService';

const EMPTY_FORM = {
  title: 'Popup Banner',
  heading: '',
  body: '',
  imageUrl: '',
  ctaLabel: 'Deposit Now',
  ctaLink: '/deposit',
  displayOrder: 0,
  isActive: true,
};

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

export default function AdminPopupBannerPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const loadBanners = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminPopupBanners();
      setBanners(result.data || []);
    } catch (error) {
      showToast(error.message || 'Failed to load popup banners');
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
  };

  const handleCreate = async () => {
    if (!form.heading.trim()) {
      showToast('Heading is required');
      return;
    }
    if (!form.body.trim()) {
      showToast('Body is required');
      return;
    }

    setSubmitting(true);
    try {
      await createAdminPopupBanner({
        ...form,
        displayOrder: Number(form.displayOrder) || 0,
      });
      showToast('Popup banner created successfully', 'success');
      resetForm();
      await loadBanners();
    } catch (error) {
      showToast(error.message || 'Failed to create popup banner');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      await updateAdminPopupBanner(banner.id, {
        title: banner.title,
        heading: banner.heading,
        body: banner.body,
        imageUrl: banner.imageUrl,
        ctaLabel: banner.ctaLabel,
        ctaLink: banner.ctaLink,
        displayOrder: banner.displayOrder,
        isActive: !banner.isActive,
      });
      showToast('Popup banner status updated', 'success');
      await loadBanners();
    } catch (error) {
      showToast(error.message || 'Failed to update popup banner status');
    }
  };

  const handleDelete = async (banner) => {
    if (!window.confirm(`Delete popup "${banner.heading}"?`)) return;

    try {
      await deleteAdminPopupBanner(banner.id);
      showToast('Popup banner deleted successfully', 'success');
      await loadBanners();
    } catch (error) {
      showToast(error.message || 'Failed to delete popup banner');
    }
  };

  const busy = submitting || loading;

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="admin-popup-banner-page space-y-5">
        <div>
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Popup Banners</h2>
          <p className="mt-1 text-sm text-slate-500">
            Site-wide promotional popup shown on the homepage.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Create new popup</h3>

          <div className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Title (small label)</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  disabled={busy}
                  placeholder="Popup Banner"
                  className="admin-popup-banner-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Heading</span>
                <input
                  type="text"
                  value={form.heading}
                  onChange={(event) => updateField('heading', event.target.value)}
                  disabled={busy}
                  placeholder="Get 100% Bonus on your first Deposit!"
                  className="admin-popup-banner-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Body</span>
              <textarea
                value={form.body}
                onChange={(event) => updateField('body', event.target.value)}
                disabled={busy}
                rows={4}
                placeholder="Popup message body..."
                className="admin-popup-banner-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Image URL <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <input
                type="text"
                value={form.imageUrl}
                onChange={(event) => updateField('imageUrl', event.target.value)}
                disabled={busy}
                placeholder="https://..."
                className="admin-popup-banner-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">CTA Label</span>
                <input
                  type="text"
                  value={form.ctaLabel}
                  onChange={(event) => updateField('ctaLabel', event.target.value)}
                  disabled={busy}
                  placeholder="Deposit Now"
                  className="admin-popup-banner-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">CTA Link</span>
                <input
                  type="text"
                  value={form.ctaLink}
                  onChange={(event) => updateField('ctaLink', event.target.value)}
                  disabled={busy}
                  placeholder="/deposit"
                  className="admin-popup-banner-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-end gap-6">
              <label className="block w-32">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Display order</span>
                <input
                  type="number"
                  value={form.displayOrder}
                  onChange={(event) => updateField('displayOrder', event.target.value)}
                  disabled={busy}
                  className="admin-popup-banner-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>

              <div className="flex items-center gap-3 pb-1">
                <ToggleSwitch
                  checked={form.isActive}
                  onChange={(value) => updateField('isActive', value)}
                  disabled={busy}
                />
                <span className="text-sm font-medium text-slate-700">Active</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreate}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              <Plus size={16} />
              {submitting ? 'Creating...' : 'Create popup'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Existing popups</h3>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-400">Loading...</div>
            ) : banners.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">No popup banners yet.</div>
            ) : (
              banners.map((banner) => (
                <div
                  key={banner.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-400">{banner.title}</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{banner.heading}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{banner.body}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      CTA: {banner.ctaLabel || '—'} → {banner.ctaLink || '—'} · order: {banner.displayOrder}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <ToggleSwitch
                        checked={banner.isActive}
                        onChange={() => handleToggleActive(banner)}
                      />
                      <span className="text-sm text-slate-600">Active</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(banner)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      aria-label="Delete popup banner"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
