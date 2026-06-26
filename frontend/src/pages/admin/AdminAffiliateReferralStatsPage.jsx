import { useCallback, useEffect, useState } from 'react';
import AdminToast from '../../components/admin/AdminToast';
import { fetchReferralStatistics } from '../../services/adminAffiliateService';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminAffiliateReferralStatsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchReferralStatistics());
    } catch (error) {
      setToast(error.message || 'Failed to load statistics');
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

      <div className="space-y-6">
        <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Referral Statistics</h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Total Affiliates', data?.totals?.totalAffiliates ?? 0],
            ['Total Referrals', data?.totals?.totalReferrals ?? 0],
            ['Total Deposit', `৳${formatMoney(data?.totals?.totalDeposit)}`],
            ['Total Commission', `৳${formatMoney(data?.totals?.totalCommission)}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{loading ? '—' : value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-800">Top Affiliates</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Referral Code</th>
                  <th className="px-4 py-3">Referrals</th>
                  <th className="px-4 py-3">Commission</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : (data?.topAffiliates || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                      No approved affiliate statistics found.
                    </td>
                  </tr>
                ) : (
                  (data?.topAffiliates || []).map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3 font-mono text-violet-700">{row.referralCode}</td>
                      <td className="px-4 py-3">{row.totalReferrals}</td>
                      <td className="px-4 py-3">৳{formatMoney(row.totalCommission)}</td>
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
