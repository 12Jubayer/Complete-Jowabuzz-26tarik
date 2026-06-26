import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import {
  createCommissionPeriod,
  fetchCommissionPeriods,
  updateCommissionPeriod,
} from '../../services/adminAffiliateCommissionPeriodService';
import {
  fetchCommissionSettings,
  updateGlobalCommission,
} from '../../services/adminAffiliateService';

const COMMISSION_OPTIONS = [5, 10, 15, 20, 25, 30];
const INPUT_CLASS =
  'admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none';

function formatDate(value) {
  if (!value) return '—';
  return String(value).slice(0, 10);
}

export default function AdminAffiliateCommissionPage() {
  const [settings, setSettings] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');
  const [form, setForm] = useState({
    startDate: '',
    endDate: '',
    commissionPercent: '25',
    isActive: true,
  });

  const showToast = (message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsData, periodData] = await Promise.all([
        fetchCommissionSettings(),
        fetchCommissionPeriods(),
      ]);
      setSettings(settingsData);
      setPeriods(periodData.periods || []);
    } catch (error) {
      showToast(error.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveCommission = async (commissionPercent) => {
    try {
      await updateGlobalCommission(commissionPercent);
      showToast('Default commission updated', 'success');
      await load();
    } catch (error) {
      showToast(error.message || 'Update failed');
    }
  };

  const handleCreatePeriod = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await createCommissionPeriod({
        startDate: form.startDate,
        endDate: form.endDate,
        commissionPercent: Number(form.commissionPercent),
        isActive: form.isActive,
      });
      showToast('Commission period created', 'success');
      setForm({ startDate: '', endDate: '', commissionPercent: '25', isActive: true });
      await load();
    } catch (error) {
      showToast(error.message || 'Failed to create commission period');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePeriod = async (period) => {
    try {
      await updateCommissionPeriod(period.id, { isActive: !period.isActive });
      showToast(period.isActive ? 'Commission period deactivated' : 'Commission period activated', 'success');
      await load();
    } catch (error) {
      showToast(error.message || 'Failed to update commission period');
    }
  };

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Commission Settings</h2>
          <p className="mt-1 text-sm text-slate-500">
            Date-wise commission % for referral activity calculation. Settlement bar/day settings are in Settlement Settings.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">Default Commission %</p>
          <p className="mt-1 text-sm text-slate-500">Used when no active date-wise commission period matches</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {COMMISSION_OPTIONS.map((pct) => (
              <button
                key={pct}
                type="button"
                disabled={loading}
                onClick={() => saveCommission(pct)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  settings?.defaultCommissionPercent === pct
                    ? 'bg-violet-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleCreatePeriod} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-violet-600" />
            <p className="text-sm font-semibold text-slate-800">Date-wise Commission Period</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Start Date</span>
              <input type="date" required value={form.startDate} onChange={(e) => setForm((c) => ({ ...c, startDate: e.target.value }))} className={INPUT_CLASS} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">End Date</span>
              <input type="date" required value={form.endDate} onChange={(e) => setForm((c) => ({ ...c, endDate: e.target.value }))} className={INPUT_CLASS} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Commission Percentage</span>
              <input type="number" min="0" max="100" step="0.01" required value={form.commissionPercent} onChange={(e) => setForm((c) => ({ ...c, commissionPercent: e.target.value }))} className={INPUT_CLASS} />
            </label>
            <label className="flex items-center gap-2 self-end pb-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))} />
              <span className="text-sm text-slate-700">Active</span>
            </label>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
              {submitting ? 'Saving...' : 'Add Commission Period'}
            </button>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Start Date</th>
                  <th className="px-4 py-3">End Date</th>
                  <th className="px-4 py-3">Commission %</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Loading...</td></tr>
                ) : periods.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No commission periods yet</td></tr>
                ) : (
                  periods.map((period) => (
                    <tr key={period.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{formatDate(period.startDate)}</td>
                      <td className="px-4 py-3">{formatDate(period.endDate)}</td>
                      <td className="px-4 py-3 font-semibold text-violet-600">{period.commissionPercent}%</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${period.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {period.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => handleTogglePeriod(period)} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {period.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
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
