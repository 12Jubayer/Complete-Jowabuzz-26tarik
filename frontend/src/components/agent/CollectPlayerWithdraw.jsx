import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  confirmPlayerWithdrawByOtp,
  fetchPendingPlayerWithdrawRequests,
} from '../../services/agentPlayerService';

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function CollectPlayerWithdraw({ onBack, onSuccess }) {
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);

  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const rows = await fetchPendingPlayerWithdrawRequests();
      setPending(rows);
    } catch {
      setPending([]);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedOtp = otp.trim();

    if (!/^\d{6}$/.test(trimmedOtp)) {
      setError('Enter the 6-digit OTP from the player');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await confirmPlayerWithdrawByOtp(trimmedOtp);
      onSuccess(result.message || 'Player withdraw completed');
    } catch (err) {
      setError(err.message || 'Failed to process withdraw');
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
            onClick={onBack}
            className="rounded-md p-1 text-slate-600 hover:bg-slate-100"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h3 className="text-lg font-semibold text-slate-900">Collect Player Withdraw</h3>
        </div>

        <div className="p-5">
          <p className="text-sm leading-relaxed text-slate-600">
            প্লেয়ার Generate OTP করলে ৬-ডিজিট OTP পাবেন। OTP দিলে ব্যালেন্স কেটে ক্যাশ আউট
            সম্পন্ন হবে।
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Player OTP (6 digits)</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(event) => {
                  setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                className={`${INPUT_CLASS} tracking-[0.35em] text-center`}
                placeholder="- - - - - -"
                disabled={submitting}
                autoComplete="one-time-code"
              />
            </label>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {submitting ? 'Processing...' : 'Confirm Cash Out'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <h4 className="text-sm font-bold text-slate-900">Pending Requests</h4>
            {loadingPending ? (
              <p className="mt-2 text-sm text-slate-400">Loading...</p>
            ) : pending.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">No pending withdraw requests</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {pending.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <p className="font-semibold text-slate-900">{item.playerName}</p>
                    <p className="text-slate-600">৳{formatMoney(item.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
