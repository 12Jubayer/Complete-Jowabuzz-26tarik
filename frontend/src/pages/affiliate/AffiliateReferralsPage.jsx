import { useCallback, useEffect, useState } from 'react';
import AdminToast from '../../components/admin/AdminToast';
import { fetchAffiliateReferrals } from '../../services/affiliateDashboardService';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AffiliateReferralsPage() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAffiliateReferrals();
      setReferrals(data.referrals || []);
    } catch (error) {
      setToast(error.message || 'Failed to load referrals');
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

      <div className="mx-auto max-w-7xl space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-[28px]">My Referrals</h2>

        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-10 text-center text-sm text-slate-400">
            Loading...
          </div>
        ) : referrals.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-10 text-center text-sm text-slate-400">
            No referrals yet
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {referrals.map((row) => (
                <article key={row.userId} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{row.username}</p>
                      <p className="text-xs text-slate-500">ID {row.userId}</p>
                    </div>
                    <p className="text-xs text-slate-500">{formatDate(row.registrationDate)}</p>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-400">Deposit</dt>
                      <dd className="font-medium text-emerald-600">৳{formatMoney(row.deposit)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Turnover</dt>
                      <dd className="font-medium text-slate-700">৳{formatMoney(row.turnover)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Profit/Loss</dt>
                      <dd className={`font-medium ${row.profitLoss >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        ৳{formatMoney(row.profitLoss)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-400">Commission</dt>
                      <dd className="font-semibold text-violet-600">৳{formatMoney(row.generatedCommission)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">User ID</th>
                      <th className="px-4 py-3">Username</th>
                      <th className="px-4 py-3">Registration Date</th>
                      <th className="px-4 py-3">Deposit</th>
                      <th className="px-4 py-3">Turnover</th>
                      <th className="px-4 py-3">Profit/Loss</th>
                      <th className="px-4 py-3">Generated Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((row) => (
                      <tr key={row.userId} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800">{row.userId}</td>
                        <td className="px-4 py-3 text-slate-700">{row.username}</td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(row.registrationDate)}</td>
                        <td className="px-4 py-3 text-emerald-600">৳{formatMoney(row.deposit)}</td>
                        <td className="px-4 py-3 text-slate-700">৳{formatMoney(row.turnover)}</td>
                        <td className={`px-4 py-3 ${row.profitLoss >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          ৳{formatMoney(row.profitLoss)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-violet-600">
                          ৳{formatMoney(row.generatedCommission)}
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
