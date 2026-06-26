import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import AffiliateLineChart, { AffiliateStatCard } from '../../components/affiliate/AffiliateLineChart';
import { fetchAffiliateDashboard } from '../../services/affiliateDashboardService';

function formatMoney(value) {
  return `৳${Number(value || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AffiliateDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const dashboard = await fetchAffiliateDashboard();
      setData(dashboard);
    } catch (error) {
      setToast(error.message || 'Failed to load dashboard');
      window.setTimeout(() => setToast(''), 3500);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-7 w-40 rounded bg-slate-200 sm:h-8 sm:w-48" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-200 sm:h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminToast message={toast} />

      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-[28px]">Dashboard</h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">Welcome back, {data?.name}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              load({ silent: true });
            }}
            disabled={refreshing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <AffiliateStatCard label="Total Referrals" value={data?.totalReferrals ?? 0} tone="violet" />
          <AffiliateStatCard label="Available Balance" value={formatMoney(data?.availableBalance)} tone="emerald" />
          <AffiliateStatCard label="Pending Balance" value={formatMoney(data?.pendingBalance)} tone="amber" />
          <AffiliateStatCard label="Total Balance" value={formatMoney(data?.totalBalance)} tone="blue" />
        </div>

        <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">
          <AffiliateLineChart
            title="Weekly Earnings Graph"
            data={data?.charts?.weeklyEarnings || []}
            valueKey="amount"
            stroke="#7C3AED"
          />
          <AffiliateLineChart
            title="Referral Statistics Graph"
            data={data?.charts?.referralStatistics || []}
            valueKey="count"
            stroke="#059669"
          />
        </div>
      </div>
    </>
  );
}
