import { useCallback, useEffect, useState } from 'react';
import AdminToast from '../../components/admin/AdminToast';
import { fetchAffiliateSettlements } from '../../services/affiliateDashboardService';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusClass(status) {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'rejected') return 'bg-red-50 text-red-600 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

export default function AffiliateSettlementsPage() {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAffiliateSettlements();
      setSettlements(data.settlements || []);
    } catch (error) {
      setToast(error.message || 'Failed to load settlements');
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

      <div className="mx-auto max-w-6xl space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-[28px]">Settlement History</h2>

        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-10 text-center text-sm text-slate-400">
            Loading...
          </div>
        ) : settlements.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-10 text-center text-sm text-slate-400">
            No settlements yet
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {settlements.map((row) => (
                <article key={row.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {row.weekStart} → {row.weekEnd}
                      </p>
                      <p className="mt-1 text-lg font-bold text-violet-600">৳{formatMoney(row.amount)}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusClass(row.status)}`}>
                      {row.status}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-1 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-400">Profit</dt>
                      <dd className="font-medium text-slate-700">৳{formatMoney(row.profit)}</dd>
                    </div>
                    {row.settlementUserId ? (
                      <div>
                        <dt className="text-xs text-slate-400">Settlement User ID</dt>
                        <dd className="font-medium text-slate-700">{row.settlementUserId}</dd>
                      </div>
                    ) : null}
                    {row.approvedAt ? (
                      <div>
                        <dt className="text-xs text-slate-400">Approved At</dt>
                        <dd className="font-medium text-slate-700">
                          {new Date(row.approvedAt).toLocaleString()}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </article>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Week</th>
                      <th className="px-4 py-3">Profit</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Settlement User ID</th>
                      <th className="px-4 py-3">Approved At</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 text-slate-700">
                          {row.weekStart} → {row.weekEnd}
                        </td>
                        <td className="px-4 py-3 text-slate-700">৳{formatMoney(row.profit)}</td>
                        <td className="px-4 py-3 font-semibold text-violet-600">৳{formatMoney(row.amount)}</td>
                        <td className="px-4 py-3 text-slate-700">{row.settlementUserId || '—'}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {row.approvedAt ? new Date(row.approvedAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusClass(row.status)}`}>
                            {row.status}
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
