import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import { fetchAgentTransactions } from '../../services/agentTransactionsService';
import { fetchAgentCommissions } from '../../services/agentCommissionService';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusClass(status) {
  if (status === 'approved' || status === 'completed') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (status === 'rejected') return 'bg-red-50 text-red-600 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function typeLabel(type) {
  if (type === 'topup_player') return 'Top up player';
  if (type === 'withdraw') return 'Withdraw';
  if (type === 'deposit') return 'Deposit';
  return type;
}

function isCreditType(type) {
  return type === 'deposit' || type === 'withdraw';
}

function TransactionsSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-8 w-48 rounded-lg bg-slate-200" />
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-20 rounded-xl bg-slate-200" />
      ))}
    </div>
  );
}

export default function AgentTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [monthCommission, setMonthCommission] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState('');

  const loadTransactions = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);

    try {
      const [rows, commissionData] = await Promise.all([
        fetchAgentTransactions(),
        fetchAgentCommissions(),
      ]);
      setTransactions(rows);
      setCommissions(commissionData.commissions || []);
      setMonthCommission(Number(commissionData.monthCommission || 0));
    } catch (error) {
      setToast(error.message || 'Failed to load transactions');
      window.setTimeout(() => setToast(''), 3500);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTransactions({ silent: true });
  };

  if (loading) {
    return <TransactionsSkeleton />;
  }

  return (
    <>
      <AdminToast message={toast} />

      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Transactions</h2>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            This Month Commission
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            ৳{formatMoney(monthCommission)}
          </p>
        </div>

        {commissions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Commission History
            </h3>
            {commissions.map((row) => (
              <div
                key={`commission-${row.id}`}
                className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {row.type === 'deposit' ? 'Deposit commission' : 'Withdraw commission'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.playerName || 'Player'} · {formatDate(row.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600">
                      +৳{formatMoney(row.commissionAmount)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      ৳{formatMoney(row.amount)} @ {row.rate}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Account Transactions
        </h3>

        {transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
            <p className="text-lg font-semibold text-slate-800">No transactions yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Top up or player withdraw activity will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{typeLabel(tx.type)}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(tx.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${
                        isCreditType(tx.type) ? 'text-emerald-600' : 'text-blue-600'
                      }`}
                    >
                      {isCreditType(tx.type) ? '+' : '-'}৳{formatMoney(tx.amount)}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusClass(tx.status)}`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
