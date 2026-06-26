import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import {
  approveAdminTransaction,
  fetchAdminTransactions,
  rejectAdminTransaction,
} from '../../services/adminTransactionsService';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatTypeLabel(type) {
  if (type === 'agent_topup') return 'Agent Topup';
  if (type === 'deposit') return 'Deposit';
  if (type === 'withdraw') return 'Withdraw';
  if (type === 'bonus') return 'Bonus';
  if (type === 'bet') return 'Game Bet';
  if (type === 'win') return 'Game Win';
  return type;
}

function typeBadgeClass(type) {
  if (type === 'withdraw' || type === 'bet') return 'bg-red-50 text-red-600 border-red-200';
  if (type === 'bonus') return 'bg-purple-50 text-purple-700 border-purple-200';
  if (type === 'agent_topup') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (type === 'win') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

function statusBadgeClass(status) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'rejected') return 'bg-red-50 text-red-600 border-red-200';
  return 'bg-cyan-50 text-cyan-700 border-cyan-200';
}

export default function AdminTransactionsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');

  const debouncedSearch = useDebouncedValue(search);

  const showToast = (message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  };

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminTransactions({
        startDate,
        endDate,
        status: status === 'all' ? '' : status,
        search: debouncedSearch,
        page,
        limit,
      });

      setRows(result.data || []);
      setTotal(Number(result.total || 0));
    } catch (error) {
      setRows([]);
      setTotal(0);
      showToast(error.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, status, debouncedSearch, page, limit]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, status, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleApprove = async (id) => {
    setActionId(id);
    try {
      await approveAdminTransaction(id);
      showToast('Transaction approved', 'success');
      await loadTransactions();
    } catch (error) {
      showToast(error.message || 'Approve failed');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id) => {
    setActionId(id);
    try {
      await rejectAdminTransaction(id);
      showToast('Transaction rejected', 'success');
      await loadTransactions();
    } catch (error) {
      showToast(error.message || 'Reject failed');
    } finally {
      setActionId(null);
    }
  };

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="space-y-4">
        <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Transactions</h2>

        <div className="admin-filters grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Start Date</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="admin-filter-control w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">End Date</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="admin-filter-control w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="admin-filter-control w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">Search user/id</span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search user/id"
              className="admin-filter-control w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            />
          </label>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      Loading transactions...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{row.username}</div>
                        <div className="text-xs text-slate-400">{row.userIdentifier}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${typeBadgeClass(row.type)}`}
                        >
                          {formatTypeLabel(row.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        ৳{formatMoney(row.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {row.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={actionId === row.id}
                              onClick={() => handleApprove(row.id)}
                              aria-label="Approve transaction"
                              className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              disabled={actionId === row.id}
                              onClick={() => handleReject(row.id)}
                              aria-label="Reject transaction"
                              className="flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-500 transition-colors hover:bg-red-100 disabled:opacity-50"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && total > 0 ? (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
              <span>
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-2">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="rounded-md border border-slate-200 px-3 py-1.5 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
