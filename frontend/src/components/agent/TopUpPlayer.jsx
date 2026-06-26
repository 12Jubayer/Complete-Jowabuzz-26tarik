import { useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { depositToPlayer, searchPlayers } from '../../services/agentPlayerService';

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-green-500 focus:ring-1 focus:ring-green-500';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function TopUpPlayer({ onBack, onSuccess }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (event) => {
    event?.preventDefault();
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setSearched(false);
      return;
    }

    if (!/^\d+$/.test(trimmed)) {
      setError('Enter a valid player ID');
      setResults([]);
      setSearched(true);
      return;
    }

    setSearching(true);
    setError('');
    setSelectedPlayer(null);

    try {
      const players = await searchPlayers(trimmed);
      setResults(players);
      setSearched(true);
    } catch (err) {
      setError(err.message || 'Search failed');
      setResults([]);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPlayer = (player) => {
    setSelectedPlayer(player);
    setAmount('');
    setError('');
  };

  const handleConfirmDeposit = async (event) => {
    event.preventDefault();
    const depositAmount = Number(amount);

    if (!selectedPlayer || !depositAmount || depositAmount <= 0) {
      setError('Enter a valid deposit amount');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await depositToPlayer(selectedPlayer.id, depositAmount);
      onSuccess(result.message || `Deposited ৳${depositAmount}`);
    } catch (err) {
      setError(err.message || 'Deposit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={selectedPlayer ? () => setSelectedPlayer(null) : onBack}
            className="rounded-md p-1 text-slate-600 hover:bg-slate-100"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h3 className="text-lg font-semibold text-slate-900">Top up Player</h3>
        </div>

        <div className="p-5">
          {!selectedPlayer ? (
            <>
              <form onSubmit={handleSearch}>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Search player (ID)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={query}
                    onChange={(event) => setQuery(event.target.value.replace(/\D/g, ''))}
                    placeholder="Enter player ID"
                    className={INPUT_CLASS}
                  />
                  <button
                    type="submit"
                    disabled={searching}
                    className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
                    aria-label="Search"
                  >
                    <Search size={18} />
                  </button>
                </div>
              </form>

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

              <div className="mt-4 border-t border-slate-100 pt-4">
                {!searched && (
                  <p className="text-center text-sm text-slate-400">
                    No results — enter player ID and search
                  </p>
                )}

                {searched && !error && results.length === 0 && (
                  <p className="text-center text-sm text-slate-400">
                    No results — enter player ID and search
                  </p>
                )}

                {results.length > 0 && (
                  <ul className="divide-y divide-slate-100">
                    {results.map((player) => (
                      <li key={player.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectPlayer(player)}
                          className="flex w-full items-center justify-between gap-4 py-3 text-left transition-colors hover:bg-slate-50"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{player.name}</p>
                            <p className="text-sm text-slate-400">
                              ID: {player.providerUsername || player.id}
                            </p>
                          </div>
                          <p className="font-semibold text-slate-900">৳{formatMoney(player.balance)}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleConfirmDeposit} className="space-y-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{selectedPlayer.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  ID: {selectedPlayer.providerUsername || selectedPlayer.id}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Current balance: ৳{formatMoney(selectedPlayer.balance)}
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Deposit amount (৳)
                </span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className={INPUT_CLASS}
                  required
                />
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlayer(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? 'Processing...' : 'Confirm Deposit'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
