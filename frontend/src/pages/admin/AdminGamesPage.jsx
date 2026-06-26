import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminHotGamesTab from '../../components/admin/AdminHotGamesTab';
import AdminToast from '../../components/admin/AdminToast';
import { categories as siteCategories } from '../../data/categories';
import {
  bulkToggleAdminGames,
  fetchAdminGames,
  fetchAdminProviders,
  toggleAdminGame,
  toggleAdminProvider,
  updateAdminGameDetails,
  updateAdminProviderDetails,
} from '../../services/adminGameService';

const TABS = [
  { id: 'hot', label: 'Hot Game' },
  { id: 'provider', label: 'Provider Setting' },
  { id: 'all', label: 'All Game Setting' },
];

const TOGGLE_API_FIELD_MAP = {
  isHot: 'hot',
  isFeatured: 'featured',
  isLive: 'live',
  isActive: 'active',
};

function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function ToggleSwitch({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
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

const EDITABLE_CATEGORIES = siteCategories.filter((item) => item.id !== 'hot');

function GameEditModal({ game, open, onClose, onSaved, showToast }) {
  const [gameName, setGameName] = useState('');
  const [providerName, setProviderName] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && game) {
      setGameName(game.gameName || '');
      setProviderName(game.providerName || '');
      setCategory(game.category || '');
    }
  }, [open, game]);

  if (!open || !game) return null;

  const handleSave = async () => {
    const trimmedName = gameName.trim();
    const trimmedProvider = providerName.trim();
    const trimmedCategory = category.trim();

    if (!trimmedName) {
      showToast('Game name is required');
      return;
    }

    setSaving(true);
    try {
      const result = await updateAdminGameDetails(game.id, {
        gameName: trimmedName,
        providerName: trimmedProvider,
        category: trimmedCategory,
      });
      showToast('Game details updated', 'success');
      onSaved(result.data);
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to update game');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900">Edit Game</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Game Name</span>
            <input
              value={gameName}
              onChange={(event) => setGameName(event.target.value)}
              className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Provider Name</span>
            <input
              value={providerName}
              onChange={(event) => setProviderName(event.target.value)}
              className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
            >
              <option value="">Select category</option>
              {EDITABLE_CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function resolveTab(search) {
  const tab = new URLSearchParams(search).get('tab');
  return tab === 'provider' || tab === 'all' ? tab : 'hot';
}

export default function AdminGamesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = resolveTab(location.search);
  const isHotTab = activeTab === 'hot';

  const [games, setGames] = useState([]);
  const [providers, setProviders] = useState([]);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState('');
  const [editingGame, setEditingGame] = useState(null);
  const [editingProviderId, setEditingProviderId] = useState(null);
  const [providerNameDraft, setProviderNameDraft] = useState('');
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');

  const debouncedSearch = useDebouncedValue(search);

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const setActiveTab = (tabId) => {
    navigate({ pathname: '/admin/games', search: `?tab=${tabId}` }, { replace: true });
    setPage(1);
    setSelectedIds([]);
  };

  const reloadData = useCallback(async () => {
    if (isHotTab) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const providerResult = await fetchAdminProviders();
      setProviders(providerResult.data || []);

      if (activeTab === 'provider') {
        return;
      }

      const gameResult = await fetchAdminGames({
        tab: 'all',
        search: debouncedSearch,
        provider: providerFilter,
        page,
        limit: 20,
      });

      setGames(gameResult.data || []);
      setTotalRecords(Number(gameResult.pagination?.totalRecords || 0));
      setTotalPages(Number(gameResult.pagination?.totalPages || 1));
    } catch (error) {
      showToast(error.message || 'Failed to load game settings');
      setGames([]);
      setProviders([]);
      setTotalRecords(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, providerFilter, page, isHotTab, showToast]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [activeTab, debouncedSearch, providerFilter]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  const visibleGameIds = useMemo(() => games.map((game) => game.id), [games]);
  const allVisibleSelected =
    visibleGameIds.length > 0 && visibleGameIds.every((id) => selectedIds.includes(id));

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleGameIds.includes(id)));
      return;
    }

    setSelectedIds((current) => [...new Set([...current, ...visibleGameIds])]);
  };

  const handleToggleSelect = (gameId) => {
    setSelectedIds((current) =>
      current.includes(gameId) ? current.filter((id) => id !== gameId) : [...current, gameId],
    );
  };

  const handleGameToggle = async (gameId, field, value) => {
    const apiField = TOGGLE_API_FIELD_MAP[field] || field;
    const toggleKey = `${gameId}-${apiField}`;
    setTogglingKey(toggleKey);

    try {
      const result = await toggleAdminGame(gameId, apiField, value);
      const updated = result.data;

      setGames((current) =>
        current.map((row) => (row.id === gameId ? { ...row, ...updated } : row)),
      );
      showToast('Game updated', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to update game');
    } finally {
      setTogglingKey('');
    }
  };

  const handleProviderToggle = async (providerId, enabled) => {
    setTogglingKey(`provider-${providerId}`);
    try {
      const result = await toggleAdminProvider(providerId, enabled);
      const updated = result.data;

      setProviders((current) =>
        current.map((row) => (row.id === providerId ? { ...row, ...updated } : row)),
      );
      showToast('Provider updated', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to update provider');
    } finally {
      setTogglingKey('');
    }
  };

  const handleProviderNameSave = async (providerId) => {
    const trimmed = providerNameDraft.trim();
    if (!trimmed) {
      showToast('Provider name is required');
      return;
    }

    setTogglingKey(`provider-name-${providerId}`);
    try {
      const result = await updateAdminProviderDetails(providerId, { providerName: trimmed });
      const updated = result.data;
      setProviders((current) =>
        current.map((row) => (row.id === providerId ? { ...row, ...updated } : row)),
      );
      setEditingProviderId(null);
      showToast('Provider name updated', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to update provider name');
    } finally {
      setTogglingKey('');
    }
  };

  const handleBulkToggle = async (field, value) => {
    if (!selectedIds.length) {
      showToast('Select at least one game');
      return;
    }

    setTogglingKey(`bulk-${field}`);
    try {
      await bulkToggleAdminGames({ gameIds: selectedIds, field, value });
      await reloadData();
      showToast(`${selectedIds.length} game(s) updated`, 'success');
    } catch (error) {
      showToast(error.message || 'Failed to bulk update games');
    } finally {
      setTogglingKey('');
    }
  };

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Game Setting</h2>
            {isHotTab ? (
              <p className="mt-1 text-sm text-slate-500">
                Manage hot games shown on the main site. Add or remove games anytime.
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                Manual game management only. Live Oracle sync and API settings are disabled.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'hot' ? (
          <AdminHotGamesTab showToast={showToast} />
        ) : activeTab === 'provider' ? (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Provider</th>
                    <th className="px-4 py-3 font-semibold">Enabled</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-10 text-center text-slate-500">
                        Loading providers...
                      </td>
                    </tr>
                  ) : providers.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-10 text-center text-slate-500">
                        No providers found
                      </td>
                    </tr>
                  ) : (
                    providers.map((provider) => (
                      <tr key={provider.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {editingProviderId === provider.id ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                value={providerNameDraft}
                                onChange={(event) => setProviderNameDraft(event.target.value)}
                                className="admin-filter-control min-w-[180px] rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900"
                              />
                              <button
                                type="button"
                                disabled={togglingKey === `provider-name-${provider.id}`}
                                onClick={() => handleProviderNameSave(provider.id)}
                                className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingProviderId(null)}
                                className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{provider.providerName}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProviderId(provider.id);
                                  setProviderNameDraft(provider.providerName || '');
                                }}
                                className="rounded-md border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <ToggleSwitch
                            checked={provider.enabled}
                            disabled={togglingKey === `provider-${provider.id}`}
                            onChange={(value) => handleProviderToggle(provider.id, value)}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search game or provider..."
                className="admin-filter-control min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />

              <select
                value={providerFilter}
                onChange={(event) => setProviderFilter(event.target.value)}
                className="admin-filter-control rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              >
                <option value="">All providers</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.providerCode}>
                    {provider.providerName}
                  </option>
                ))}
              </select>

              <label className="ml-auto inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                Select all ({totalRecords})
              </label>
            </div>

            {selectedIds.length > 0 ? (
              <div className="flex flex-wrap gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm">
                <span className="font-medium text-emerald-800">{selectedIds.length} selected</span>
                <button
                  type="button"
                  disabled={Boolean(togglingKey)}
                  onClick={() => handleBulkToggle('hot', true)}
                  className="rounded-md bg-white px-3 py-1 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  Set Hot ON
                </button>
                <button
                  type="button"
                  disabled={Boolean(togglingKey)}
                  onClick={() => handleBulkToggle('active', false)}
                  className="rounded-md bg-white px-3 py-1 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  Set Active OFF
                </button>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-10 px-4 py-3" />
                      <th className="px-4 py-3 font-semibold">Game</th>
                      <th className="px-4 py-3 font-semibold">Provider</th>
                      <th className="px-4 py-3 font-semibold">Hot</th>
                      <th className="px-4 py-3 font-semibold">Featured</th>
                      <th className="px-4 py-3 font-semibold">Live</th>
                      <th className="px-4 py-3 font-semibold">Active</th>
                      <th className="px-4 py-3 font-semibold">Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                          Loading games...
                        </td>
                      </tr>
                    ) : games.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                          No games found
                        </td>
                      </tr>
                    ) : (
                      games.map((game) => (
                        <tr key={game.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(game.id)}
                              onChange={() => handleToggleSelect(game.id)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">{game.gameName}</td>
                          <td className="px-4 py-3 text-slate-600">{game.providerName}</td>
                          <td className="px-4 py-3">
                            <ToggleSwitch
                              checked={game.isHot}
                              disabled={togglingKey === `${game.id}-hot`}
                              onChange={(value) => handleGameToggle(game.id, 'isHot', value)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <ToggleSwitch
                              checked={game.isFeatured}
                              disabled={togglingKey === `${game.id}-featured`}
                              onChange={(value) => handleGameToggle(game.id, 'isFeatured', value)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <ToggleSwitch
                              checked={game.isLive}
                              disabled={togglingKey === `${game.id}-live`}
                              onChange={(value) => handleGameToggle(game.id, 'isLive', value)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <ToggleSwitch
                              checked={game.isActive}
                              disabled={togglingKey === `${game.id}-active`}
                              onChange={(value) => handleGameToggle(game.id, 'isActive', value)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setEditingGame(game)}
                              className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm">
                <span className="text-slate-600">
                  Page {page} of {totalPages} ({totalRecords} games)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      <GameEditModal
        game={editingGame}
        open={Boolean(editingGame)}
        onClose={() => setEditingGame(null)}
        onSaved={(updated) => {
          setGames((current) => current.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
        }}
        showToast={showToast}
      />
    </>
  );
}
