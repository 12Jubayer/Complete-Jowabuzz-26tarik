import { useCallback, useEffect, useRef, useState } from 'react';
import { Pencil, Trash2, Upload } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import {
  createAdminFavouriteSlider,
  deleteAdminFavouriteSlider,
  fetchAdminFavouriteSliders,
  updateAdminFavouriteSlider,
} from '../../services/adminFavouriteSliderService';
import { uploadAdminSliderImage } from '../../services/adminSiteConfigService';

const EMPTY_FORM = {
  title: '',
  imageUrl: '',
  linkUrl: '',
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

export default function AdminFavouriteSliderPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [sliders, setSliders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');
  const fileInputRef = useRef(null);

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const loadSliders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminFavouriteSliders();
      setSliders(result.data || []);
    } catch (error) {
      showToast(error.message || 'Failed to load favourite sliders');
      setSliders([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSliders();
  }, [loadSliders]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast('Title is required');
      return;
    }
    if (!form.imageUrl.trim()) {
      showToast('Image URL is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        displayOrder: Number(form.displayOrder) || 0,
      };

      if (editingId) {
        await updateAdminFavouriteSlider(editingId, payload);
        showToast('Favourite slider updated successfully', 'success');
      } else {
        await createAdminFavouriteSlider(payload);
        showToast('Favourite slider created successfully', 'success');
      }

      resetForm();
      await loadSliders();
    } catch (error) {
      showToast(error.message || 'Failed to save favourite slider');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (slider) => {
    setEditingId(slider.id);
    setForm({
      title: slider.title || '',
      imageUrl: slider.imageUrl || '',
      linkUrl: slider.linkUrl || '',
      displayOrder: slider.displayOrder ?? 0,
      isActive: slider.isActive !== false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (slider) => {
    if (!window.confirm(`Delete favourite slider "${slider.title}"?`)) return;

    try {
      await deleteAdminFavouriteSlider(slider.id);
      showToast('Favourite slider deleted successfully', 'success');
      if (editingId === slider.id) {
        resetForm();
      }
      await loadSliders();
    } catch (error) {
      showToast(error.message || 'Failed to delete favourite slider');
    }
  };

  const handleToggleActive = async (slider) => {
    try {
      await updateAdminFavouriteSlider(slider.id, {
        title: slider.title,
        imageUrl: slider.imageUrl,
        linkUrl: slider.linkUrl || '',
        displayOrder: slider.displayOrder,
        isActive: !slider.isActive,
      });
      showToast(
        slider.isActive ? 'Favourite slider deactivated' : 'Favourite slider activated',
        'success',
      );
      await loadSliders();
    } catch (error) {
      showToast(error.message || 'Failed to update favourite slider status');
    }
  };

  const handleMoveOrder = async (slider, direction) => {
    const sorted = [...sliders].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id,
    );
    const index = sorted.findIndex((item) => item.id === slider.id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const other = sorted[targetIndex];
    setSubmitting(true);
    try {
      await updateAdminFavouriteSlider(slider.id, {
        ...slider,
        displayOrder: other.displayOrder,
      });
      await updateAdminFavouriteSlider(other.id, {
        ...other,
        displayOrder: slider.displayOrder,
      });
      showToast('Display order updated', 'success');
      await loadSliders();
    } catch (error) {
      showToast(error.message || 'Failed to update display order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadAdminSliderImage(file);
      updateField('imageUrl', result.imageUrl || result.url || '');
      showToast('Image uploaded successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const busy = submitting || loading || uploading;

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="admin-favourite-slider-page space-y-5">
        <div>
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Favourite Slider</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage homepage Favourites marquee cards shown below Featured Games.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            {editingId ? 'Edit slider' : 'Add slider'}
          </h3>

          <div className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Title</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  disabled={busy}
                  placeholder="App promo / Match banner"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Display Order</span>
                <input
                  type="number"
                  value={form.displayOrder}
                  onChange={(event) => updateField('displayOrder', event.target.value)}
                  disabled={busy}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Image URL</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(event) => updateField('imageUrl', event.target.value)}
                  disabled={busy}
                  placeholder="/uploads/sliders/example.webp"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleUploadClick}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Upload size={16} />
                  Upload
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </label>

            {form.imageUrl ? (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  className="h-32 w-full object-cover object-center"
                />
              </div>
            ) : null}

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Redirect Link <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <input
                type="text"
                value={form.linkUrl}
                onChange={(event) => updateField('linkUrl', event.target.value)}
                disabled={busy}
                placeholder="/promotions or https://example.com"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </label>

            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Active</p>
                <p className="text-xs text-slate-500">Show this slider on the homepage</p>
              </div>
              <ToggleSwitch
                checked={form.isActive}
                onChange={(value) => updateField('isActive', value)}
                disabled={busy}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {editingId ? 'Save' : 'Add Slider'}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={busy}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Saved sliders</h3>
          </div>

          {loading ? (
            <p className="px-5 py-8 text-sm text-slate-500">Loading favourite sliders...</p>
          ) : sliders.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">No favourite sliders yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {sliders.map((slider) => (
                <div
                  key={slider.id}
                  className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="h-16 w-28 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                      {slider.imageUrl ? (
                        <img
                          src={slider.imageUrl}
                          alt={slider.title}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{slider.title}</p>
                      <p className="truncate text-xs text-slate-500">
                        Order: {slider.displayOrder} · {slider.isActive ? 'Active' : 'Inactive'}
                      </p>
                      {slider.linkUrl ? (
                        <p className="truncate text-xs text-slate-400">{slider.linkUrl}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <ToggleSwitch
                      checked={slider.isActive}
                      onChange={() => handleToggleActive(slider)}
                      disabled={busy}
                    />
                    <button
                      type="button"
                      onClick={() => handleMoveOrder(slider, 'up')}
                      disabled={busy}
                      className="rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      title="Move up"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveOrder(slider, 'down')}
                      disabled={busy}
                      className="rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      title="Move down"
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(slider)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(slider)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
