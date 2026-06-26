import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImageIcon, Pencil, Search, Upload, X } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import {
  deleteAdminGameCustomImage,
  fetchAdminGameImages,
  updateAdminGameImage,
  uploadAdminGameImage,
} from '../../services/adminGameImageService';

const PLACEHOLDER = '/images/game-placeholder.svg';
const IMAGE_STATUS_OPTIONS = [
  { value: 'all', label: 'All Games' },
  { value: 'with_custom', label: 'With Custom Image' },
  { value: 'without_custom', label: 'Without Custom Image' },
];

function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function StatCard({ label, value, gradient }) {
  return (
    <div className={`rounded-2xl p-5 text-white shadow-sm ${gradient}`}>
      <p className="text-sm font-medium text-white/90">{label}</p>
      <p className="mt-2 text-3xl font-bold">{Number(value || 0).toLocaleString()}</p>
    </div>
  );
}

function GameImageEditModal({ game, open, onClose, onSaved, showToast }) {
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open && game) {
      setImageUrl(game.customImageUrl || game.imageUrl || '');
    }
  }, [open, game]);

  if (!open || !game) return null;

  const previewUrl = imageUrl.trim() || game.displayImageUrl || PLACEHOLDER;

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadAdminGameImage(file);
      setImageUrl(result.imageUrl || '');
      showToast(result.message || 'Image uploaded', 'success');
    } catch (error) {
      showToast(error.message || 'Upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSave = async () => {
    const url = imageUrl.trim();
    if (!url) {
      showToast('Image URL is required');
      return;
    }

    setSaving(true);
    try {
      const result = await updateAdminGameImage(game.id, url);
      showToast(result.message || 'Game image saved', 'success');
      onSaved(result.data);
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to save game image');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!game.hasCustomImage) {
      setImageUrl(game.imageUrl || '');
      return;
    }

    if (!window.confirm('Remove custom image for this game?')) return;

    setRemoving(true);
    try {
      const result = await deleteAdminGameCustomImage(game.id);
      showToast(result.message || 'Custom image removed', 'success');
      onSaved(result.data);
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to remove custom image');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900">Edit Game Image</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Game Name</span>
            <input
              readOnly
              value={game.gameName}
              className="admin-filter-control w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Provider</span>
            <input
              readOnly
              value={game.providerName}
              className="admin-filter-control w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Current Image Preview</span>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img src={previewUrl} alt={game.gameName} className="h-44 w-full object-cover" />
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Image URL</span>
            <input
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="Paste image URL or upload below"
              className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleUpload}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <Upload size={16} />
            {uploading ? 'Uploading...' : 'Upload Image'}
          </button>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing || saving}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {removing ? 'Removing...' : 'Remove Custom Image'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploading}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminGameImagesPage() {
  const [games, setGames] = useState([]);
  const [stats, setStats] = useState({
    totalGames: 0,
    customImages: 0,
    withoutCustom: 0,
    totalProviders: 0,
  });
  const [providers, setProviders] = useState([]);
  const [providerFilter, setProviderFilter] = useState('');
  const [imageStatus, setImageStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');
  const [editingGame, setEditingGame] = useState(null);

  const debouncedSearch = useDebouncedValue(search);

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const providerOptions = useMemo(
    () => [...providers].sort((a, b) => a.name.localeCompare(b.name)),
    [providers],
  );

  const loadGames = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminGameImages({
        providerId: providerFilter,
        imageStatus,
        search: debouncedSearch,
        page,
        limit: 48,
      });

      setGames(result.data || []);
      setStats(result.stats || {});
      setProviders(result.providers || []);
      setTotalRecords(Number(result.pagination?.totalRecords || 0));
      setTotalPages(Number(result.pagination?.totalPages || 1));
    } catch (error) {
      showToast(error.message || 'Failed to load game images');
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [providerFilter, imageStatus, debouncedSearch, page, showToast]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  useEffect(() => {
    setPage(1);
  }, [providerFilter, imageStatus, debouncedSearch]);

  const handleSaved = (updatedGame) => {
    setGames((current) => current.map((game) => (game.id === updatedGame.id ? updatedGame : game)));
    loadGames();
  };

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2.5">
            <ImageIcon className="text-emerald-500" size={22} />
            <h2 className="text-[26px] font-bold tracking-tight text-slate-900">Game Images Management</h2>
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            Customize game thumbnails — upload your own image or paste a URL.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Games"
            value={stats.totalGames}
            gradient="bg-gradient-to-br from-violet-500 to-blue-500"
          />
          <StatCard
            label="Custom Images"
            value={stats.customImages}
            gradient="bg-gradient-to-br from-teal-500 to-emerald-500"
          />
          <StatCard
            label="Without Custom"
            value={stats.withoutCustom}
            gradient="bg-gradient-to-br from-orange-400 to-yellow-400"
          />
          <StatCard
            label="Providers"
            value={stats.totalProviders}
            gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
          />
        </div>

        <div className="admin-filters rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Search size={16} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">Filter Games</h3>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Provider</span>
              <select
                value={providerFilter}
                onChange={(event) => setProviderFilter(event.target.value)}
                className="admin-filter-control w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="">All Providers</option>
                {providerOptions.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Image Status</span>
              <select
                value={imageStatus}
                onChange={(event) => setImageStatus(event.target.value)}
                className="admin-filter-control w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
              >
                {IMAGE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Search game name</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search game name..."
                className="admin-filter-control w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900">Games ({totalRecords.toLocaleString()})</h3>
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </p>
          </div>

          {loading ? (
            <p className="py-16 text-center text-sm text-slate-500">Loading games...</p>
          ) : games.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">No games found.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {games.map((game) => (
                <article key={game.id} className="group">
                  <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img
                      src={game.displayImageUrl || PLACEHOLDER}
                      alt={game.gameName}
                      className="aspect-square w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingGame(game)}
                      title="Edit image"
                      aria-label={`Edit image for ${game.gameName}`}
                      className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow hover:bg-emerald-600"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  <p className="mt-2 truncate text-sm font-bold text-slate-900" title={game.gameName}>
                    {game.gameName}
                  </p>
                  <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {game.providerName}
                  </p>
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || loading}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages || loading}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <GameImageEditModal
        game={editingGame}
        open={Boolean(editingGame)}
        onClose={() => setEditingGame(null)}
        onSaved={handleSaved}
        showToast={showToast}
      />
    </>
  );
}
