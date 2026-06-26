import { useCallback, useEffect, useState } from 'react';
import AdminToast from '../../components/admin/AdminToast';
import { fetchAffiliateCommission } from '../../services/affiliateDashboardService';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AffiliateCommissionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchAffiliateCommission());
    } catch (error) {
      setToast(error.message || 'Failed to load commission');
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

      <div className="mx-auto max-w-5xl space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-[28px]">Commission</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {[
            ['Total Commission', `৳${formatMoney(data?.totalCommission)}`],
            ['Pending', `৳${formatMoney(data?.pendingCommission)}`],
            ['Settled', `৳${formatMoney(data?.settledCommission)}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:text-[11px]">{label}</p>
              <p className="mt-2 text-lg font-bold text-slate-900 sm:text-2xl">{loading ? '—' : value}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
