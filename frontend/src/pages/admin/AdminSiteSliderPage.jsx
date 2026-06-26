import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import SiteConfigurationTabs, {
  SiteConfigurationHeader,
} from '../../components/admin/SiteConfigurationTabs';
import {
  fetchAdminHomepageSliders,
  updateAdminHomepageSliders,
  uploadAdminSliderImage,
} from '../../services/adminSiteConfigService';

function createEmptySlider() {
  return {
    clientKey: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: null,
    title: '',
    imageUrl: '',
    linkUrl: '',
    isActive: true,
  };
}

export default function AdminSiteSliderPage() {
  const [sliders, setSliders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState('');
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');
  const fileInputRefs = useRef({});

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const loadSliders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminHomepageSliders();
      setSliders(
        (result.data || []).map((row) => ({
          clientKey: `id-${row.id}`,
          id: row.id,
          title: row.title || '',
          imageUrl: row.imageUrl,
          linkUrl: row.linkUrl || '',
          isActive: row.isActive,
        })),
      );
    } catch (error) {
      showToast(error.message || 'Failed to load sliders');
      setSliders([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSliders();
  }, [loadSliders]);

  const updateSlider = (clientKey, patch) => {
    setSliders((current) =>
      current.map((row) => (row.clientKey === clientKey ? { ...row, ...patch } : row)),
    );
  };

  const handleAddSlider = () => {
    setSliders((current) => [...current, createEmptySlider()]);
  };

  const handleRemoveSlider = (clientKey) => {
    setSliders((current) => current.filter((row) => row.clientKey !== clientKey));
  };

  const handleUploadClick = (clientKey) => {
    fileInputRefs.current[clientKey]?.click();
  };

  const handleFileSelected = async (clientKey, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setUploadingKey(clientKey);
    try {
      const result = await uploadAdminSliderImage(file);
      updateSlider(clientKey, { imageUrl: result.imageUrl });
      showToast('Image uploaded successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to upload image');
    } finally {
      setUploadingKey('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = sliders.map((row) => ({
        id: row.id,
        title: row.title,
        imageUrl: row.imageUrl,
        linkUrl: row.linkUrl,
        isActive: row.isActive,
      }));

      const result = await updateAdminHomepageSliders(payload);
      showToast('Slider updated successfully', 'success');
      setSliders(
        (result.data || []).map((row) => ({
          clientKey: `id-${row.id}`,
          id: row.id,
          title: row.title || '',
          imageUrl: row.imageUrl,
          linkUrl: row.linkUrl || '',
          isActive: row.isActive,
        })),
      );
    } catch (error) {
      showToast(error.message || 'Failed to save sliders');
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
          <h3 className="text-lg font-semibold text-slate-900">Homepage Slider</h3>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading sliders...</div>
          ) : (
            <div className="mt-5 space-y-4">
              {sliders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                  No sliders yet. Click &quot;Add Slider&quot; to create one.
                </div>
              ) : (
                sliders.map((row) => (
                  <div key={row.clientKey} className="rounded-xl border border-slate-200 p-4">
                    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr_1fr_auto] lg:items-end">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">
                          Title <span className="font-normal text-slate-400">(optional)</span>
                        </span>
                        <input
                          type="text"
                          value={row.title}
                          onChange={(event) =>
                            updateSlider(row.clientKey, { title: event.target.value })
                          }
                          disabled={saving || uploadingKey === row.clientKey}
                          className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          placeholder="Deposit Bonus 100% & 50%"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">
                          Image <span className="font-normal text-slate-400">(URL or upload)</span>
                        </span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={row.imageUrl}
                            onChange={(event) =>
                              updateSlider(row.clientKey, { imageUrl: event.target.value })
                            }
                            disabled={saving || uploadingKey === row.clientKey}
                            className="admin-filter-control min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                            placeholder="https://..."
                          />
                          <input
                            ref={(node) => {
                              fileInputRefs.current[row.clientKey] = node;
                            }}
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(event) => handleFileSelected(row.clientKey, event)}
                          />
                          <button
                            type="button"
                            onClick={() => handleUploadClick(row.clientKey)}
                            disabled={saving || uploadingKey === row.clientKey}
                            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            aria-label="Upload slider image"
                          >
                            <Upload size={18} />
                          </button>
                        </div>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">
                          Link URL
                        </span>
                        <input
                          type="text"
                          value={row.linkUrl}
                          onChange={(event) =>
                            updateSlider(row.clientKey, { linkUrl: event.target.value })
                          }
                          disabled={saving || uploadingKey === row.clientKey}
                          className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          placeholder="/promo"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => handleRemoveSlider(row.clientKey)}
                        disabled={saving || uploadingKey === row.clientKey}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50 lg:mb-0.5"
                        aria-label="Delete slider"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {row.imageUrl ? (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        <img
                          src={row.imageUrl}
                          alt={row.title || 'Slider preview'}
                          className="h-auto max-h-56 w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                ))
              )}

              <button
                type="button"
                onClick={handleAddSlider}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Plus size={16} />
                Add Slider
              </button>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={saving || Boolean(uploadingKey)}
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
