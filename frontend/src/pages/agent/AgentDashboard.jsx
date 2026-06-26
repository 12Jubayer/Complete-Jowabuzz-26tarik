import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Copy,
  LogOut,
  Menu,
  RefreshCw,
} from 'lucide-react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import AdminToast from '../../components/admin/AdminToast';
import TopUpPlayer from '../../components/agent/TopUpPlayer';
import CollectPlayerWithdraw from '../../components/agent/CollectPlayerWithdraw';
import { useAgentAuth } from '../../context/AgentAuthContext';
import { fetchAgentDashboard } from '../../services/agentDashboardService';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse space-y-3">
      <div className="h-5 w-32 rounded bg-slate-200" />
      <div className="h-24 rounded-xl bg-slate-200" />
      <div className="h-20 rounded-xl bg-slate-200" />
      <div className="h-5 rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-2.5">
        <div className="h-12 rounded-xl bg-slate-200" />
        <div className="h-12 rounded-xl bg-slate-200" />
      </div>
      <div className="h-24 rounded-xl bg-slate-200" />
      <div className="h-11 rounded-xl bg-slate-200" />
    </div>
  );
}

export default function AgentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, openMobileMenu } = useOutletContext() || {};
  const { logout } = useAgentAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');
  const [view, setView] = useState('dashboard');

  const showToast = (message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  };

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);

    try {
      const dashboard = await fetchAgentDashboard();
      setData(dashboard);
    } catch (error) {
      showToast(error.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, location.key]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard({ silent: true });
  };

  const handleCopyUid = async () => {
    if (!data?.uid) return;

    try {
      await navigator.clipboard.writeText(data.uid);
      showToast('UID copied to clipboard', 'success');
    } catch {
      showToast('Failed to copy UID');
    }
  };

  const handleExit = async () => {
    await logout();
    navigate('/agent/login', { replace: true });
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (view === 'topup-player') {
    return (
      <>
        <AdminToast message={toast} type={toastType} />
        <TopUpPlayer
          onBack={() => setView('dashboard')}
          onSuccess={async (message) => {
            showToast(message, 'success');
            setView('dashboard');
            await loadDashboard({ silent: true });
          }}
        />
      </>
    );
  }

  if (view === 'collect-withdraw') {
    return (
      <>
        <AdminToast message={toast} type={toastType} />
        <CollectPlayerWithdraw
          onBack={() => setView('dashboard')}
          onSuccess={async (message) => {
            showToast(message, 'success');
            setView('dashboard');
            await loadDashboard({ silent: true });
          }}
        />
      </>
    );
  }

  const displayBalance = Number(data?.displayBalance ?? data?.balance ?? 0);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#F8F9FA]">
      <AdminToast message={toast} type={toastType} />

      <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col justify-between">
        <div className="shrink-0 space-y-3">
        <div className="flex items-center gap-2">
          {isMobile && (
            <button
              type="button"
              onClick={openMobileMenu}
              className="-ml-1 rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          )}
          <h2 className="min-w-0 flex-1 text-base font-bold tracking-tight text-slate-900">
            My account
          </h2>
          <p className="truncate text-xs font-semibold text-slate-700">{data?.mobile || '—'}</p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-3.5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                Agent UID
              </p>
              <p className="mt-1 text-lg font-bold tracking-wide text-emerald-700">
                {data?.uid || '—'}
              </p>
              <p className="mt-1.5 text-[11px] leading-snug text-emerald-700/90">
                প্লেয়ার এই UID দিয়ে উইথড্র করবে
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyUid}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
            >
              <Copy size={13} />
              Copy
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-full border border-slate-100 bg-slate-50 p-2 text-slate-500 transition-colors hover:bg-white disabled:opacity-60"
              aria-label="Refresh balance"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Current Balance
              </p>
              <p className="mt-0.5 text-3xl font-bold leading-none tracking-tight text-slate-900">
                {formatMoney(displayBalance)}
                <span className="ml-1 text-xl font-bold text-emerald-600">৳</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">BDT (৳)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-1 py-0.5">
          <p className="text-xs text-slate-500">Agent Name</p>
          <p className="truncate text-sm font-semibold text-slate-900">{data?.name || '—'}</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setView('topup-player')}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600 active:scale-[0.98]"
          >
            <ArrowDownToLine size={18} />
            Top up
          </button>
          <button
            type="button"
            onClick={() => setView('collect-withdraw')}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600 active:scale-[0.98]"
          >
            <ArrowUpFromLine size={18} />
            Withdraw
          </button>
        </div>
        </div>

        <div
          className="shrink-0 space-y-3"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Lifetime Balance
            </p>
            <p className="text-base font-bold text-emerald-600">
              ৳{formatMoney(data?.lifetimeBalance)}
            </p>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-2">
              <span className="text-[11px] font-medium text-emerald-700">Deposit</span>
              <span className="text-[11px] font-semibold text-emerald-700">
                +৳{formatMoney(data?.totalDeposit)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-red-50 px-2.5 py-2">
              <span className="text-[11px] font-medium text-red-600">Withdraw</span>
              <span className="text-[11px] font-semibold text-red-600">
                -৳{formatMoney(data?.totalWithdraw)}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExit}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <LogOut size={16} />
          Exit
        </button>
        </div>
      </div>
    </div>
  );
}
