import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminToast from '../../components/admin/AdminToast';
import { fetchAgentCommissionSettlements } from '../../services/agentCommissionService';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatStatus(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'pending') return 'Pending';
  if (value === 'rejected') return 'Rejected';
  if (value === 'approved' || value === 'settled') return 'Settled';
  return status || 'Pending';
}

function statusClass(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'approved' || value === 'settled') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (value === 'rejected') return 'bg-red-50 text-red-600 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function AgentSettlementsPage() {
  const [data, setData] = useState({ settlements: [], pendingSettlementTotal: 0, settledSettlementTotal: 0 });
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAgentCommissionSettlements();
      setData({
        settlements: result.settlements || [],
        pendingSettlementTotal: Number(result.pendingSettlementTotal || 0),
        settledSettlementTotal: Number(result.settledSettlementTotal || 0),
        currentPeriodLabel: result.currentPeriodLabel,
        currentSettlementType: result.currentSettlementType,
      });
    } catch (error) {
      setToast(error.message || 'Failed to load settlement history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return data.settlements;
    if (filter === 'settled') {
      return data.settlements.filter((row) => ['approved', 'settled'].includes(String(row.status).toLowerCase()));
    }
    return data.settlements.filter((row) => String(row.status).toLowerCase() === filter);
  }, [data.settlements, filter]);

  return (
    <>
      <AdminToast message={toast} />

      <div className="mx-auto max-w-6xl space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Commission History</h2>
          <p className="mt-2 text-sm text-slate-500">
            Monthly commission settlements. Pending until admin approves — you cannot approve yourself.
          </p>
          {data.currentPeriodLabel ? (
            <p className="mt-1 text-sm font-medium text-emerald-700">
              Current monthly period: {data.currentPeriodLabel}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase text-amber-700">Pending Commission</p>
            <p className="mt-1 text-2xl font-bold text-amber-800">৳{formatMoney(data.pendingSettlementTotal)}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase text-emerald-700">Settled Commission</p>
            <p className="mt-1 text-2xl font-bold text-emerald-800">৳{formatMoney(data.settledSettlementTotal)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'settled', label: 'Settled' },
            { id: 'rejected', label: 'Rejected' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={[
                'rounded-full px-3 py-1.5 text-xs font-semibold',
                filter === item.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-10 text-center text-sm text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-10 text-center text-sm text-slate-400">No settlement records yet</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Deposit Comm.</th>
                    <th className="px-4 py-3">Withdraw Comm.</th>
                    <th className="px-4 py-3">Total Commission</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Settlement Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{row.periodLabel || row.dateRange}</div>
                        <div className="text-xs text-slate-400">
                          {String(row.periodStart || '').slice(0, 10)} – {String(row.periodEnd || '').slice(0, 10)}
                        </div>
                      </td>
                      <td className="px-4 py-3">৳{formatMoney(row.depositCommission)}</td>
                      <td className="px-4 py-3">৳{formatMoney(row.withdrawCommission)}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">৳{formatMoney(row.totalCommission)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClass(row.status)}`}>
                          {formatStatus(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatStatus(row.status) === 'Settled'
                          ? formatDateTime(row.approvedAt)
                          : formatDateTime(row.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
