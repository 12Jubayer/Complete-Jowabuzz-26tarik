import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Plus, Search, X } from 'lucide-react';
import {
  addAdminHotGame,
  fetchAdminHotGames,
  removeAdminHotGame,
  reorderAdminHotGames,
  searchAdminGames,
} from '../../services/adminGameService';

function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function GameImage({ src, alt }) {
  return (
    <div className="mx-auto h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">No image</div>
      )}
    </div>
  );
}

function HotGameCard({
  serial,
  game,
  onAdd,
  onRemove,
  onMoveUp,
  onMoveDown,
  adding = false,
  removing = false,
  moving = false,
  canMoveUp = false,
  canMoveDown = false,
  showAdd = true,
  showRemove = true,
  showReorder = false,
}) {
  const isAdded = game.isHot;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-emerald-50 px-2 text-xs font-semibold text-emerald-700">
          #{serial}
        </span>
        {showReorder ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!canMoveUp || moving}
              onClick={() => onMoveUp?.()}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Move up"
            >
              <ChevronUp size={16} />
            </button>
            <button
              type="button"
              disabled={!canMoveDown || moving}
              onClick={() => onMoveDown?.()}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Move down"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        ) : null}
      </div>

      <GameImage src={game.displayImageUrl} alt={game.gameName} />

      <div className="mt-4 flex-1 text-center">
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{game.gameName}</h3>
        <p className="mt-1 text-xs text-slate-500">{game.providerName}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {showAdd ? (
          <button
            type="button"
            disabled={isAdded || adding}
            onClick={() => onAdd?.(game.id)}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {adding ? 'Adding...' : isAdded ? 'Added' : 'Add'}
          </button>
        ) : null}

        {showRemove ? (
          <button
            type="button"
            disabled={removing}
            onClick={() => onRemove?.(game.id)}
            className={[
              'rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50',
              showAdd ? 'border-red-200 text-red-600 hover:bg-red-50' : 'col-span-2 border-red-200 text-red-600 hover:bg-red-50',
            ].join(' ')}
          >
            {removing ? 'Removing...' : 'Remove'}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function AddHotGameModal({ open, hotGameIds, onClose, onAdd, showToast }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);

  const debouncedQuery = useDebouncedValue(query);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setAddingId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const q = debouncedQuery.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    setSearching(true);

    searchAdminGames(q)
      .then((result) => {
        if (!cancelled) {
          setResults(result.data || []);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          showToast(error.message || 'Failed to search games');
          setResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open, showToast]);

  const enrichedResults = useMemo(
    () =>
      results.map((game) => ({
        ...game,
        isHot: hotGameIds.has(game.id) || game.isHot,
      })),
    [results, hotGameIds],
  );

  const handleAdd = async (gameId) => {
    setAddingId(gameId);
    try {
      await onAdd(gameId);
    } finally {
      setAddingId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Add Hot Game</h3>
            <p className="text-sm text-slate-500">Search synced games and add to hot list</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 py-4">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search game name or provider..."
              autoFocus
              className="admin-filter-control w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-900"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {searching ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              Searching games...
            </div>
          ) : !debouncedQuery.trim() ? (
            <p className="py-12 text-center text-sm text-slate-500">Type a game name or provider to search</p>
          ) : enrichedResults.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">No games found</p>
          ) : (
            <div className="space-y-3">
              {enrichedResults.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {game.displayImageUrl ? (
                      <img
                        src={game.displayImageUrl}
                        alt={game.gameName}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                        N/A
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{game.gameName}</p>
                    <p className="truncate text-xs text-slate-500">{game.providerName}</p>
                  </div>

                  <button
                    type="button"
                    disabled={game.isHot || addingId === game.id}
                    onClick={() => handleAdd(game.id)}
                    className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    {addingId === game.id ? 'Adding...' : game.isHot ? 'Added' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminHotGamesTab({ showToast }) {
  const [hotGames, setHotGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [moving, setMoving] = useState(false);

  const hotGameIds = useMemo(() => new Set(hotGames.map((game) => game.id)), [hotGames]);

  const loadHotGames = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminHotGames();
      setHotGames(result.data || []);
    } catch (error) {
      showToast(error.message || 'Failed to load hot games');
      setHotGames([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadHotGames();
  }, [loadHotGames]);

  const persistOrder = async (nextGames) => {
    setMoving(true);
    try {
      const result = await reorderAdminHotGames(nextGames.map((game) => game.id));
      setHotGames(result.data || nextGames);
      showToast('Hot game order updated', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to reorder hot games');
      await loadHotGames();
    } finally {
      setMoving(false);
    }
  };

  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= hotGames.length) return;

    const nextGames = [...hotGames];
    [nextGames[index], nextGames[targetIndex]] = [nextGames[targetIndex], nextGames[index]];
    setHotGames(nextGames);
    await persistOrder(nextGames);
  };

  const handleAdd = async (gameId) => {
    if (hotGameIds.has(gameId)) {
      showToast('Game is already in hot list');
      return;
    }

    setAddingId(gameId);
    try {
      const result = await addAdminHotGame(gameId);
      setHotGames((current) => {
        const exists = current.some((game) => game.id === gameId);
        if (exists) return current;
        return [...current, result.data];
      });
      showToast('Game added to hot list', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to add game');
    } finally {
      setAddingId(null);
    }
  };

  const handleRemove = async (gameId) => {
    setRemovingId(gameId);
    try {
      await removeAdminHotGame(gameId);
      const nextGames = hotGames.filter((game) => game.id !== gameId);
      setHotGames(nextGames);
      if (nextGames.length) {
        await persistOrder(nextGames);
      }
      showToast('Game removed from hot list', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to remove game');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Hot Game List</h3>
          <p className="text-sm text-slate-500">
            {loading ? 'Loading...' : `${hotGames.length} game(s) — first 28 show on home, use arrows to set order`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus size={16} />
          Add Hot Game
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white py-16 text-sm text-slate-500 shadow-sm">
          <Loader2 size={18} className="animate-spin" />
          Loading hot games...
        </div>
      ) : hotGames.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">No hot games yet</p>
          <p className="mt-1 text-sm text-slate-500">Click &quot;Add Hot Game&quot; to search and add games</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {hotGames.map((game, index) => (
            <HotGameCard
              key={game.id}
              serial={index + 1}
              game={{ ...game, isHot: true }}
              onAdd={handleAdd}
              onRemove={handleRemove}
              onMoveUp={() => handleMove(index, -1)}
              onMoveDown={() => handleMove(index, 1)}
              adding={addingId === game.id}
              removing={removingId === game.id}
              moving={moving}
              canMoveUp={index > 0}
              canMoveDown={index < hotGames.length - 1}
              showAdd={false}
              showRemove
              showReorder
            />
          ))}
        </div>
      )}

      <AddHotGameModal
        open={modalOpen}
        hotGameIds={hotGameIds}
        onClose={() => setModalOpen(false)}
        onAdd={handleAdd}
        showToast={showToast}
      />
    </>
  );
}
