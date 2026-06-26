import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Save } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import {
  fetchAdminWeeklyCashback,
  fetchAdminWeeklyCashbackPayouts,
  saveAdminWeeklyCashback,
} from '../../services/adminWeeklyCashbackService';

const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString();
}

export default function AdminWeeklyCashbackPage() {
  const [enabled, setEnabled] = useState(true);
  const [cashbackPercent, setCashbackPercent] = useState('2');
  const [minNetLoss, setMinNetLoss] = useState('0');
  const [dayOfWeek, setDayOfWeek] = useState(3);
  const [hourUtc, setHourUtc] = useState('3');
  const [lastRunAt, setLastRunAt] = useState(null);
  const [lastRunCredited, setLastRunCredited] = useState(0);
  const [lastRunSkipped, setLastRunSkipped] = useState(0);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const applySettings = useCallback((settings) => {
    if (!settings) return;
    setEnabled(Boolean(settings.enabled));
    setCashbackPercent(String(settings.cashbackPercent ?? 2));
    setMinNetLoss(String(settings.minNetLoss ?? 0));
    setDayOfWeek(Number(settings.dayOfWeek ?? 3));
    setHourUtc(String(settings.hourUtc ?? 3));
    setLastRunAt(settings.lastRunAt || null);
    setLastRunCredited(Number(settings.lastRunCredited || 0));
    setLastRunSkipped(Number(settings.lastRunSkipped || 0));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsResult, payoutsResult] = await Promise.all([
        fetchAdminWeeklyCashback(),
        fetchAdminWeeklyCashbackPayouts(),
      ]);
      applySettings(settingsResult.settings);
      setPayouts(payoutsResult.payouts || []);
    } catch (error) {
      showToast(error.message || 'Failed to load weekly cashback');
    } finally {
      setLoading(false);
    }
  }, [applySettings, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveAdminWeeklyCashback({
        enabled,
        cashbackPercent: Number(cashbackPercent),
        minNetLoss: Number(minNetLoss),
        dayOfWeek: Number(dayOfWeek),
        hourUtc: Number(hourUtc),
      });
      applySettings(result.settings);
      showToast(result.message || 'Settings saved', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const selectedDayLabel = DAY_OPTIONS.find((option) => option.value === dayOfWeek)?.label || 'Wednesday';

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="admin-weekly-cashback-page space-y-5">
        <div>
          <div className="flex items-center gap-2.5">
            <CalendarDays className="text-emerald-500" size={22} strokeWidth={2.2} />
            <h2 className="text-[26px] font-bold tracking-tight text-slate-900">Weekly Cashback</h2>
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            Users automatically receive a percentage of their net weekly losses as cashback. Runs on the
            saved schedule when enabled. Idempotent per week.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              disabled={loading || saving}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Enabled
          </label>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Cashback %</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={cashbackPercent}
                onChange={(event) => setCashbackPercent(event.target.value)}
                disabled={loading || saving}
                placeholder="e.g. 2"
                className="admin-weekly-cashback-input w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Min net loss to qualify (৳)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={minNetLoss}
                onChange={(event) => setMinNetLoss(event.target.value)}
                disabled={loading || saving}
                placeholder="e.g. 0"
                className="admin-weekly-cashback-input w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Day of week (UTC)</span>
              <select
                value={dayOfWeek}
                onChange={(event) => setDayOfWeek(Number(event.target.value))}
                disabled={loading || saving}
                className="admin-weekly-cashback-input w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
              >
                {DAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Hour (0-23, UTC)</span>
              <input
                type="number"
                min="0"
                max="23"
                step="1"
                value={hourUtc}
                onChange={(event) => setHourUtc(event.target.value)}
                disabled={loading || saving}
                placeholder="0-23"
                className="admin-weekly-cashback-input w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
              />
            </label>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            {enabled
              ? `Auto-run schedule: every ${selectedDayLabel} at ${hourUtc}:05 UTC (after Save).`
              : 'Auto-run is disabled until Enabled is checked and saved.'}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {lastRunAt
              ? `Last run: ${formatDateTime(lastRunAt)} — credited ${lastRunCredited}, skipped ${lastRunSkipped}`
              : 'Last run: never — credited 0, skipped 0'}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent payouts</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Net Loss</th>
                  <th className="px-4 py-3">%</th>
                  <th className="px-4 py-3">Cashback</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">Loading...</td>
                  </tr>
                ) : payouts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">No cashback yet.</td>
                  </tr>
                ) : (
                  payouts.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{formatDateTime(row.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{row.userName}</div>
                        {row.userPhone ? (
                          <div className="text-xs text-slate-400">{row.userPhone}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">৳{formatMoney(row.netLoss)}</td>
                      <td className="px-4 py-3">{row.cashbackPercent}%</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">৳{formatMoney(row.cashbackAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
