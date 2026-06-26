import { useCallback, useEffect, useState } from 'react';
import AdminToast from '../../components/admin/AdminToast';
import { fetchAdminReport } from '../../services/adminReportService';

const TABS = [
  { id: 'deposit', label: 'Deposit' },
  { id: 'withdraw', label: 'Withdraw' },
  { id: 'bonus', label: 'Bonus' },
  { id: 'affiliate', label: 'Affiliate' },
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

function statusBadgeClass(status) {
  if (status === 'approved' || status === 'released') {
    return 'text-emerald-600';
  }
  if (status === 'rejected') {
    return 'text-red-600';
  }
  return 'text-slate-600';
}

export default function AdminMyReportPage() {
  const [activeTab, setActiveTab] = useState('deposit');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userPrefix, setUserPrefix] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [rows, setRows] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');

  const debouncedUserPrefix = useDebouncedValue(userPrefix);

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminReport({
        type: activeTab,
        startDate,
        endDate,
        userPrefix: debouncedUserPrefix,
        page,
        limit,
      });

      setRows(result.data || []);
      setTotalAmount(Number(result.totalAmount || 0));
      setTotalRecords(Number(result.totalRecords || 0));
    } catch (error) {
      setRows([]);
      setTotalAmount(0);
      setTotalRecords(0);
      showToast(error.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate, debouncedUserPrefix, page, limit, showToast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, startDate, endDate, debouncedUserPrefix]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / limit));

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="space-y-5">
        <div>
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">My Report</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-3">
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
            <span className="mb-1.5 block text-xs font-medium text-slate-500">User ID prefix</span>
            <input
              type="text"
              value={userPrefix}
              onChange={(event) => setUserPrefix(event.target.value)}
              placeholder="User ID prefix"
              className="admin-filter-control w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
            />
          </label>
        </div>

        <div className="text-sm text-slate-600">
          Total: <span className="font-semibold text-emerald-600">৳{formatMoney(totalAmount)}</span>
          <span className="mx-2">•</span>
          <span>{totalRecords} records</span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      Loading report...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      No records found
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={`${row.id}-${row.date}`} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.id}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.user}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">৳{formatMoney(row.amount)}</td>
                      <td className={`px-4 py-3 capitalize ${statusBadgeClass(row.status)}`}>
                        {row.status}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(row.date).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && totalRecords > limit ? (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
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
