import { useCallback, useEffect, useState } from 'react';
import AdminToast from '../../components/admin/AdminToast';
import { fetchAffiliateSettlements } from '../../services/affiliateDashboardService';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isAdminAdjustment(row) {
  return row?.recordType === 'admin_adjustment';
}

function formatStatus(row) {
  if (isAdminAdjustment(row)) return 'Completed';

  const value = String(row?.status || '').toLowerCase();
  if (value === 'pending') return 'Pending';
  if (value === 'rejected') return 'Rejected';
  if (value === 'released' || value === 'completed' || value === 'settled') return 'Settled';
  return row?.status || 'Pending';
}

function formatAmount(row) {
  if (isAdminAdjustment(row) && row.adjustmentType === 'add') {
    return `+৳${formatMoney(row.amount)}`;
  }
  return `৳${formatMoney(row.amount)}`;
}

function statusClass(row) {
  const value = isAdminAdjustment(row)
    ? 'completed'
    : String(row?.status || '').toLowerCase();

  if (value === 'released' || value === 'completed' || value === 'settled') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (value === 'rejected') return 'bg-red-50 text-red-600 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function formatSettlementType(row) {
  if (isAdminAdjustment(row)) return 'Adjustment';
  const type = String(row.settlementType || '').toLowerCase();
  if (type === 'daily') return 'Daily';
  if (type === 'weekly') return 'Weekly';
  const start = String(row.weekStart || '').slice(0, 10);
  const end = String(row.weekEnd || '').slice(0, 10);
  return start && start === end ? 'Daily' : 'Weekly';
}

function rowTitle(row) {
  if (isAdminAdjustment(row)) return row.typeLabel || 'Admin Balance Adjustment';

  const type = String(row.settlementType || '').toLowerCase();
  const start = String(row.weekStart || row.startDate || '').slice(0, 10);

  if (type === 'daily' || (start && start === String(row.weekEnd || row.endDate || '').slice(0, 10))) {
    return start || row.weekRange || row.settlementName || 'Daily';
  }

  if (row.weekRange) return row.weekRange;
  if (row.settlementName) return row.settlementName;
  return `${start} → ${String(row.weekEnd || '').slice(0, 10)}`;
}

function rowDateRange(row) {
  if (isAdminAdjustment(row)) return row.note || '';
  const type = String(row.settlementType || '').toLowerCase();
  if (type === 'daily') return '';
  if (row.dateRange) return row.dateRange;
  const start = String(row.weekStart || '').slice(0, 10);
  const end = String(row.weekEnd || '').slice(0, 10);
  if (!start && !end) return '';
  if (start === end) return '';
  return `${start} – ${end}`;
}

export default function AffiliateWithdrawPage() {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAffiliateSettlements();
      setSettlements(data.settlements || []);
    } catch (error) {
      setToast(error.message || 'Failed to load settlement history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <AdminToast message={toast} />

      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-[28px]">
            Settlement History
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Daily or weekly settlements stay Pending until admin approves. No self-withdraw — history only.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-10 text-center text-sm text-slate-400">
            Loading...
          </div>
        ) : settlements.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-10 text-center text-sm text-slate-400">
            No settlement records yet
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {settlements.map((row) => (
                <article key={row.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {formatSettlementType(row)}
                      </p>
                      <p className="text-sm font-semibold text-slate-800">{rowTitle(row)}</p>
                      {rowDateRange(row) ? (
                        <p className="mt-0.5 text-xs text-slate-400">{rowDateRange(row)}</p>
                      ) : null}
                      <p className="mt-1 text-lg font-bold text-violet-600">{formatAmount(row)}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClass(row)}`}>
                      {formatStatus(row)}
                    </span>
                  </div>
                  {!isAdminAdjustment(row) ? (
                    <dl className="mt-3 grid grid-cols-1 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-slate-400">Profit</dt>
                        <dd className="font-medium text-slate-700">৳{formatMoney(row.profit)}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-3 text-sm text-slate-600">
                      <span className="text-xs text-slate-400">Note: </span>
                      {row.note || 'Manual balance adjustment by admin'}
                    </p>
                  )}
                </article>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3">Profit / Note</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 text-slate-700">{formatSettlementType(row)}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="font-medium">{rowTitle(row)}</div>
                          {rowDateRange(row) ? (
                            <div className="text-xs text-slate-400">{rowDateRange(row)}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {isAdminAdjustment(row) ? row.note || 'Manual balance adjustment by admin' : `৳${formatMoney(row.profit)}`}
                        </td>
                        <td className="px-4 py-3 font-semibold text-violet-600">{formatAmount(row)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClass(row)}`}>
                            {formatStatus(row)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
