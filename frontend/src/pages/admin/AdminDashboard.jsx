import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Users,
} from 'lucide-react';
import AdminDashboardChart from '../../components/admin/AdminDashboardChart';
import AdminToast from '../../components/admin/AdminToast';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminSessionExpiredError } from '../../services/adminAuthService';
import {
  fetchDashboardStats,
  getEmptyDashboardStats,
} from '../../services/adminStatsService';
function formatCurrency(value) {
  return `৳${Number(value || 0).toLocaleString('en-BD')}`;
}

function StatCard({ label, value, icon: Icon, iconTone = 'green' }) {
  const iconStyles =
    iconTone === 'red'
      ? 'bg-red-50 text-red-500'
      : 'bg-emerald-50 text-emerald-500';

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-[28px] font-bold leading-none text-slate-900">
            {value}
          </p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconStyles}`}>
          <Icon size={20} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded-lg bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[108px] rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="h-[340px] rounded-xl bg-slate-200" />
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAdminAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState('');

  const loadStats = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);

    try {
      const result = await fetchDashboardStats();

      if (!result.success) {
        throw new Error('Unable to load dashboard stats');
      }

      setStats(result.data);
    } catch (error) {
      if (error instanceof AdminSessionExpiredError) {
        await logout();
        navigate('/admin/login', { replace: true });
        return;
      }

      setStats(getEmptyDashboardStats());
      setToast(error.message || 'Failed to load dashboard stats');
      window.setTimeout(() => setToast(''), 3500);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logout, navigate]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats({ silent: true });
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <AdminToast message={toast} />

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Dashboard</h2>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
            aria-label="Refresh dashboard stats"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Users"
            value={stats?.totalUsers ?? 0}
            icon={Users}
          />
          <StatCard
            label="Total Deposit"
            value={formatCurrency(stats?.totalDeposit)}
            icon={ArrowDownToLine}
          />
          <StatCard
            label="Total Withdraw"
            value={formatCurrency(stats?.totalWithdraw)}
            icon={ArrowUpFromLine}
            iconTone="red"
          />
          <StatCard
            label="Today TX"
            value={stats?.todayTx ?? 0}
            icon={Activity}
          />
        </div>

        <AdminDashboardChart data={stats?.dailyTransactions ?? []} />
      </div>
    </>
  );
}
