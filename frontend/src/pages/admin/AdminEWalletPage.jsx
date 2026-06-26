import { useCallback, useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import {
  adjustAdminEWalletBalance,
  createAdminEWallet,
  fetchAdminEWalletInfo,
  fetchAdminEWallets,
  updateAdminEWalletStatus,
} from '../../services/adminEWalletService';

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
  if (status === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'suspended') return 'bg-red-50 text-red-600 border-red-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function formatTransactionType(type) {
  if (type === 'add') return 'Add';
  if (type === 'deduct') return 'Deduct';
  if (type === 'transfer') return 'Transfer';
  if (type === 'withdraw') return 'Withdraw';
  return type;
}

function EWalletInfoModal({ walletId, onClose, showToast }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchAdminEWalletInfo(walletId)
      .then((data) => {
        if (active) setInfo(data);
      })
      .catch((error) => showToast(error.message || 'Failed to load e-wallet info'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [walletId, showToast]);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[#0f172a] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="text-lg font-semibold">E Wallet Info</h3>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="px-5 py-16 text-center text-white/60">Loading e-wallet info...</div>
        ) : info ? (
          <div className="space-y-5 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Wallet UID', info.walletUid || '—'],
                ['Name', info.name],
                ['Phone', info.phone],
                ['Email', info.email || '—'],
                ['Balance', `৳${formatMoney(info.balance)}`],
                ['Status', info.status],
                ['Created At', new Date(info.createdAt).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-white/50">{label}</div>
                  <div className="mt-1 text-sm font-medium capitalize">{value}</div>
                </div>
              ))}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-white/80">Latest Transactions</h4>
              <div className="overflow-hidden rounded-lg border border-white/10">
                <table className="min-w-full text-xs">
                  <thead className="bg-white/5 text-left text-white/50">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Reason</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!info.latestTransactions?.length ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-white/40">
                          No transactions
                        </td>
                      </tr>
                    ) : (
                      info.latestTransactions.map((row) => (
                        <tr key={row.id} className="border-t border-white/10">
                          <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                          <td className="px-3 py-2">{formatTransactionType(row.type)}</td>
                          <td className="px-3 py-2">৳{formatMoney(row.amount)}</td>
                          <td className="px-3 py-2">{row.reason || '—'}</td>
                          <td className="px-3 py-2 capitalize">{row.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/5"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BalanceAdjustModal({ wallet, onClose, onSuccess, showToast }) {
  const [type, setType] = useState('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await adjustAdminEWalletBalance(wallet.id, {
        type,
        amount: Number(amount),
        reason,
      });
      showToast('Balance updated successfully', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to adjust balance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Adjust Balance</h3>
          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          {wallet.name} — current balance ৳{formatMoney(wallet.balance)}
        </p>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Type</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="add">Add</option>
              <option value="deduct">Deduct</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Reason</span>
            <input
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Update Balance'}
          </button>
        </div>
      </form>
    </div>
  );
}

function AddEWalletModal({ onClose, onSuccess, showToast }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    initialBalance: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        password: form.password,
        confirmPassword: form.confirmPassword,
      };
      if (form.initialBalance !== '') {
        payload.initialBalance = Number(form.initialBalance);
      }
      await createAdminEWallet(payload);
      showToast('E Wallet created successfully', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to create e-wallet');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Add E Wallet</h3>
          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          {[
            ['name', 'Name', 'text', true],
            ['phone', 'Phone', 'tel', true],
            ['password', 'Password', 'password', true],
            ['confirmPassword', 'Confirm Password', 'password', true],
            ['initialBalance', 'Initial Balance (optional)', 'number', false],
          ].map(([key, label, inputType, required]) => (
            <label key={key} className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
              <input
                type={inputType}
                required={required}
                min={inputType === 'number' ? '0' : undefined}
                step={inputType === 'number' ? '0.01' : undefined}
                value={form[key]}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create E Wallet'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminEWalletPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');
  const [infoWalletId, setInfoWalletId] = useState(null);
  const [balanceWallet, setBalanceWallet] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [actionId, setActionId] = useState(null);

  const debouncedSearch = useDebouncedValue(search);

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const loadWallets = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminEWallets({
        search: debouncedSearch,
        page,
        limit,
      });
      setRows(result.data || []);
      setTotal(Number(result.total || 0));
    } catch (error) {
      setRows([]);
      setTotal(0);
      showToast(error.message || 'Failed to load e-wallets');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit, showToast]);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleToggleStatus = async (wallet) => {
    setActionId(wallet.id);
    const nextStatus = wallet.status === 'active' ? 'suspended' : 'active';
    try {
      await updateAdminEWalletStatus(wallet.id, nextStatus);
      showToast(nextStatus === 'active' ? 'E Wallet activated' : 'E Wallet suspended', 'success');
      await loadWallets();
    } catch (error) {
      showToast(error.message || 'Failed to update status');
    } finally {
      setActionId(null);
    }
  };

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">E Wallet</h2>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus size={16} />
            Add E Wallet
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, phone, email, wallet id"
          className="admin-filter-control w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none"
        />

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      Loading e-wallets...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      No data
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{row.name}</div>
                        <div className="text-xs text-slate-400">{row.identifier}</div>
                      </td>
                      <td className="px-4 py-3 capitalize">{row.role}</td>
                      <td className="px-4 py-3 font-semibold">৳{formatMoney(row.balance)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setInfoWalletId(row.id)}
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Info
                          </button>
                          <button
                            type="button"
                            onClick={() => setBalanceWallet(row)}
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            ± Balance
                          </button>
                          <button
                            type="button"
                            disabled={actionId === row.id}
                            onClick={() => handleToggleStatus(row)}
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {row.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
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
                <span>
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

      {infoWalletId ? (
        <EWalletInfoModal
          walletId={infoWalletId}
          onClose={() => setInfoWalletId(null)}
          showToast={showToast}
        />
      ) : null}

      {balanceWallet ? (
        <BalanceAdjustModal
          wallet={balanceWallet}
          onClose={() => setBalanceWallet(null)}
          onSuccess={loadWallets}
          showToast={showToast}
        />
      ) : null}

      {addOpen ? (
        <AddEWalletModal
          onClose={() => setAddOpen(false)}
          onSuccess={loadWallets}
          showToast={showToast}
        />
      ) : null}
    </>
  );
}
