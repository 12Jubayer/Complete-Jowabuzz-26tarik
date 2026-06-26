import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GripVertical, Pencil, Plus, Save, Trash2, Upload } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import {
  createAdminPromotion,
  deleteAdminPromotion,
  fetchAdminPromotions,
  reorderAdminPromotions,
  updateAdminPromotion,
  uploadAdminPromotionImage,
} from '../../services/adminPromotionService';

const EMPTY_FORM = {
  title: '',
  badge: '',
  description: '',
  imageUrl: '',
  ctaLabel: 'Join Now',
  ctaLink: '/profile/deposit',
  displayOrder: 0,
  isActive: true,
};

const BADGE_OPTIONS = ['', 'HOT', 'NEW', 'LIMITED', 'FEATURED'];
const PAGE_SIZE = 10;

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

function reorderList(items, draggedId, targetId) {
  const next = [...items];
  const fromIndex = next.findIndex((item) => item.id === draggedId);
  const toIndex = next.findIndex((item) => item.id === targetId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return items;
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export default function AdminSitePromotionsPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [draggedId, setDraggedId] = useState(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');
  const fileInputRef = useRef(null);
  const searchTimerRef = useRef(null);

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminPromotions({
        search: search.trim(),
        status: statusFilter,
        page: 1,
        limit: 100,
      });
      setPromotions(result.data || []);
      setPage(1);
    } catch (error) {
      showToast(error.message || 'Failed to load promotions');
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, showToast]);

  useEffect(() => {
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = window.setTimeout(() => {
      loadPromotions();
    }, search ? 300 : 0);

    return () => {
      if (searchTimerRef.current) {
        window.clearTimeout(searchTimerRef.current);
      }
    };
  }, [search, statusFilter, loadPromotions]);

  const totalPages = Math.max(1, Math.ceil(promotions.length / PAGE_SIZE));
  const paginatedPromotions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return promotions.slice(start, start + PAGE_SIZE);
  }, [promotions, page]);

  const canReorder = !search.trim() && statusFilter === 'all';

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleEdit = (promotion) => {
    setEditingId(promotion.id);
    setForm({
      title: promotion.title || '',
      badge: promotion.badge || '',
      description: promotion.description || '',
      imageUrl: promotion.imageUrl || '',
      ctaLabel: promotion.ctaLabel || 'Join Now',
      ctaLink: promotion.ctaLink || '',
      displayOrder: promotion.displayOrder ?? 0,
      isActive: promotion.isActive,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUploadSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadAdminPromotionImage(file);
      updateField('imageUrl', result.imageUrl);
      showToast('Image uploaded successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        displayOrder: Number(form.displayOrder) || 0,
      };

      if (editingId) {
        await updateAdminPromotion(editingId, payload);
        showToast('Promotion saved successfully', 'success');
      } else {
        await createAdminPromotion(payload);
        showToast('Promotion created successfully', 'success');
      }

      resetForm();
      await loadPromotions();
    } catch (error) {
      showToast(error.message || 'Failed to save promotion');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (promotion) => {
    try {
      await updateAdminPromotion(promotion.id, {
        title: promotion.title,
        badge: promotion.badge,
        description: promotion.description,
        imageUrl: promotion.imageUrl,
        ctaLabel: promotion.ctaLabel,
        ctaLink: promotion.ctaLink,
        displayOrder: promotion.displayOrder,
        isActive: !promotion.isActive,
      });
      showToast('Promotion status updated', 'success');
      await loadPromotions();
    } catch (error) {
      showToast(error.message || 'Failed to update promotion status');
    }
  };

  const handleDelete = async (promotion) => {
    if (!window.confirm(`Delete promotion "${promotion.title}"?`)) return;

    try {
      await deleteAdminPromotion(promotion.id);
      showToast('Promotion deleted successfully', 'success');
      if (editingId === promotion.id) resetForm();
      await loadPromotions();
    } catch (error) {
      showToast(error.message || 'Failed to delete promotion');
    }
  };

  const handleDrop = async (targetId) => {
    if (!canReorder || !draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const next = reorderList(promotions, draggedId, targetId);
    setPromotions(next);
    setDraggedId(null);
    setReordering(true);

    try {
      await reorderAdminPromotions(next.map((item) => item.id));
      showToast('Display order updated', 'success');
      await loadPromotions();
    } catch (error) {
      showToast(error.message || 'Failed to update display order');
      await loadPromotions();
    } finally {
      setReordering(false);
    }
  };

  const busy = submitting || uploading || reordering;

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUploadSelected}
      />

      <div className="admin-promotions-page space-y-5">
        <div>
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Promotions</h2>
          <p className="mt-1 text-sm text-slate-500">Offers shown on the public /promotions page.</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            {editingId ? 'Edit promotion' : 'Create new promotion'}
          </h3>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Title</span>
              <input
                type="text"
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                disabled={busy}
                placeholder="100% Welcome Bonus"
                className="admin-promotions-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Badge <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <select
                value={form.badge}
                onChange={(event) => updateField('badge', event.target.value)}
                disabled={busy}
                className="admin-promotions-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {BADGE_OPTIONS.map((option) => (
                  <option key={option || 'none'} value={option}>
                    {option || 'None'}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                disabled={busy}
                rows={4}
                placeholder="Describe the promotion..."
                className="admin-promotions-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Image <span className="font-normal text-slate-400">(URL or upload)</span>
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(event) => updateField('imageUrl', event.target.value)}
                  disabled={busy}
                  placeholder="https://... or upload"
                  className="admin-promotions-input min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Upload size={16} />
                  Upload
                </button>
              </div>
            </label>

            {form.imageUrl ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img
                  src={form.imageUrl}
                  alt="Promotion preview"
                  className="h-auto max-h-48 w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">CTA Label</span>
                <input
                  type="text"
                  value={form.ctaLabel}
                  onChange={(event) => updateField('ctaLabel', event.target.value)}
                  disabled={busy}
                  placeholder="Join Now"
                  className="admin-promotions-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">CTA Link</span>
                <input
                  type="text"
                  value={form.ctaLink}
                  onChange={(event) => updateField('ctaLink', event.target.value)}
                  disabled={busy}
                  placeholder="/profile/deposit"
                  className="admin-promotions-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block max-w-xs">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Display order</span>
              <input
                type="number"
                value={form.displayOrder}
                onChange={(event) => updateField('displayOrder', event.target.value)}
                disabled={busy}
                className="admin-promotions-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <div className="flex items-center gap-3">
              <ToggleSwitch
                checked={form.isActive}
                onChange={(isActive) => updateField('isActive', isActive)}
                disabled={busy}
              />
              <span className="text-sm font-medium text-slate-700">Active</span>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {editingId ? <Save size={16} /> : <Plus size={16} />}
                {submitting
                  ? editingId
                    ? 'Saving...'
                    : 'Creating...'
                  : editingId
                    ? 'Save promotion'
                    : 'Create promotion'}
              </button>

              {editingId ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={resetForm}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Promotion list</h3>
              {canReorder ? (
                <p className="mt-1 text-xs text-slate-400">Drag rows to change display order.</p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">Clear search and filters to drag-reorder.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search promotions..."
                className="admin-promotions-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm sm:w-56"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="admin-promotions-input rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading promotions...</div>
          ) : promotions.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
              No promotions yet. Create one above.
            </div>
          ) : (
            <>
              <div className="mt-5 space-y-3">
                {paginatedPromotions.map((promotion) => (
                  <div
                    key={promotion.id}
                    draggable={canReorder && !busy}
                    onDragStart={() => setDraggedId(promotion.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDrop(promotion.id)}
                    className={[
                      'rounded-xl border border-slate-200 p-4 transition-colors',
                      draggedId === promotion.id ? 'border-emerald-400 bg-emerald-50/40' : '',
                    ].join(' ')}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 flex-1 gap-4">
                        {canReorder ? (
                          <div className="flex shrink-0 items-start pt-1 text-slate-400">
                            <GripVertical size={18} />
                          </div>
                        ) : null}

                        {promotion.imageUrl ? (
                          <img
                            src={promotion.imageUrl}
                            alt={promotion.title}
                            className="h-20 w-28 shrink-0 rounded-lg object-cover"
                          />
                        ) : null}

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-semibold text-slate-900">{promotion.title}</h4>
                            {promotion.badge ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                {promotion.badge}
                              </span>
                            ) : null}
                            <span
                              className={[
                                'rounded-full px-2 py-0.5 text-xs font-semibold',
                                promotion.isActive
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500',
                              ].join(' ')}
                            >
                              {promotion.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{promotion.description}</p>
                          <p className="mt-2 text-xs text-slate-400">
                            Order: {promotion.displayOrder} · CTA: {promotion.ctaLabel || '—'}{' '}
                            {promotion.ctaLink ? `→ ${promotion.ctaLink}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                          <ToggleSwitch
                            checked={promotion.isActive}
                            onChange={() => handleToggleActive(promotion)}
                          />
                          <span className="text-xs font-medium text-slate-600">
                            {promotion.isActive ? 'On' : 'Off'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEdit(promotion)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil size={15} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(promotion)}
                          className="inline-flex items-center justify-center rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                          aria-label="Delete promotion"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="mt-5 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    Page {page} of {totalPages} · {promotions.length} total
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}
