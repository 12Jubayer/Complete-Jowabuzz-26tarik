import { useCallback, useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import {
  adjustAdminAffiliateBalance,
  approveAdminAffiliateUser,
  changeAdminAffiliatePassword,
  createAdminAffiliateUser,
  fetchAdminAffiliateInfo,
  fetchAdminAffiliates,
  rejectAdminAffiliateUser,
  updateAdminAffiliateUserStatus,
} from '../../services/adminAffiliatesService';

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
  if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'rejected') return 'bg-red-50 text-red-600 border-red-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function formatTransactionType(type) {
  if (type === 'add') return 'Add';
  if (type === 'deduct') return 'Deduct';
  if (type === 'transfer') return 'Transfer';
  if (type === 'withdraw') return 'Withdraw';
  return type;
}

function AffiliateInfoModal({ affiliateId, onClose, showToast }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchAdminAffiliateInfo(affiliateId)
      .then((data) => {
        if (active) setInfo(data);
      })
      .catch((error) => showToast(error.message || 'Failed to load affiliate info'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [affiliateId, showToast]);

  const handlePasswordUpdate = async () => {
    if (password.length < 6) {
      showToast('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await changeAdminAffiliatePassword(affiliateId, { password, confirmPassword });
      showToast('Password updated successfully', 'success');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      showToast(error.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[#0f172a] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="text-lg font-semibold">Affiliate Info</h3>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="px-5 py-16 text-center text-white/60">Loading affiliate info...</div>
        ) : info ? (
          <div className="space-y-5 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Affiliate ID', info.affiliateId],
                ['Linked User ID', info.linkedUserId],
                ['Referral Code', info.referralCode],
                ['Name', info.name],
                ['Phone', info.phone],
                ['Email', info.email || '—'],
                ['Role', info.role],
                ['Status', info.status],
                ['Balance', `৳${formatMoney(info.balance)}`],
                ['Pending Commission', `৳${formatMoney(info.pendingCommission)}`],
                ['Settled Commission', `৳${formatMoney(info.settledCommission)}`],
                ['Commission % (Admin)', `${info.commissionPercent}%`],
                ['Total Referrals', info.totalReferrals],
                ['Total Link Clicks', info.totalLinkClicks],
                ['Total Signups', info.totalSignups],
                ['Total Deposit', `৳${formatMoney(info.totalDeposit)}`],
                ['Total Turnover', `৳${formatMoney(info.totalTurnover)}`],
                ['Total Profit/Loss', `৳${formatMoney(info.totalProfitLoss)}`],
                ['Joined Date', new Date(info.joinedDate).toLocaleString()],
                ['Last Login', info.lastLogin ? new Date(info.lastLogin).toLocaleString() : '—'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-white/50">{label}</div>
                  <div className="mt-1 text-sm font-medium capitalize">{value}</div>
                </div>
              ))}
            </div>

            {info.referralLink ? (
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wide text-white/50">Referral Link</div>
                <div className="mt-1 break-all text-sm text-emerald-300">{info.referralLink}</div>
              </div>
            ) : null}

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

            <div>
              <h4 className="mb-2 text-sm font-semibold text-white/80">Change Password</h4>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="New password (min 6)"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm password"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                />
                <button
                  type="button"
                  disabled={savingPassword}
                  onClick={handlePasswordUpdate}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  Update
                </button>
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

function BalanceAdjustModal({ affiliate, onClose, onSuccess, showToast }) {
  const [type, setType] = useState('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await adjustAdminAffiliateBalance(affiliate.id, {
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
          {affiliate.name} — current balance ৳{formatMoney(affiliate.balance)}
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
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">
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

function AddAffiliateModal({ onClose, onSuccess, showToast }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    initialBalance: '',
    status: 'pending',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        username: form.username,
        phone: form.phone,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        status: form.status,
      };
      if (form.initialBalance !== '') {
        payload.initialBalance = Number(form.initialBalance);
      }
      await createAdminAffiliateUser(payload);
      showToast('Affiliate created successfully', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to create affiliate');
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
          <h3 className="text-lg font-semibold text-slate-900">Add Affiliate</h3>
          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          {[
            ['name', 'Name', 'text', true],
            ['phone', 'Phone', 'tel', false],
            ['email', 'Email', 'email', false],
            ['username', 'Username', 'text', true],
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
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Initial Status</span>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>
          </label>
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
            {submitting ? 'Creating...' : 'Create Affiliate'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminAffiliatesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');
  const [infoAffiliateId, setInfoAffiliateId] = useState(null);
  const [balanceAffiliate, setBalanceAffiliate] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [actionId, setActionId] = useState(null);

  const debouncedSearch = useDebouncedValue(search);

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const loadAffiliates = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminAffiliates({
        search: debouncedSearch,
        page,
        limit,
      });
      setRows(result.data || []);
      setTotal(Number(result.total || 0));
    } catch (error) {
      setRows([]);
      setTotal(0);
      showToast(error.message || 'Failed to load affiliates');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit, showToast]);

  useEffect(() => {
    loadAffiliates();
  }, [loadAffiliates]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleToggleStatus = async (affiliate) => {
    setActionId(affiliate.id);
    const nextStatus = affiliate.status === 'active' ? 'suspended' : 'active';
    try {
      await updateAdminAffiliateUserStatus(affiliate.id, nextStatus);
      showToast(nextStatus === 'active' ? 'Affiliate activated' : 'Affiliate suspended', 'success');
      await loadAffiliates();
    } catch (error) {
      showToast(error.message || 'Failed to update status');
    } finally {
      setActionId(null);
    }
  };

  const handleApprove = async (affiliateId) => {
    setActionId(affiliateId);
    try {
      await approveAdminAffiliateUser(affiliateId);
      showToast('Affiliate approved', 'success');
      await loadAffiliates();
    } catch (error) {
      showToast(error.message || 'Failed to approve affiliate');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (affiliateId) => {
    setActionId(affiliateId);
    try {
      await rejectAdminAffiliateUser(affiliateId);
      showToast('Affiliate rejected', 'success');
      await loadAffiliates();
    } catch (error) {
      showToast(error.message || 'Failed to reject affiliate');
    } finally {
      setActionId(null);
    }
  };

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Affiliate</h2>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus size={16} />
            Add Affiliate
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, phone, email, affiliate ID"
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
                      Loading affiliates...
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
                            onClick={() => setInfoAffiliateId(row.id)}
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Info
                          </button>
                          <button
                            type="button"
                            onClick={() => setBalanceAffiliate(row)}
                            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            ± Balance
                          </button>
                          {row.status === 'pending' || row.status === 'rejected' ? (
                            <>
                              <button
                                type="button"
                                disabled={actionId === row.id}
                                onClick={() => handleApprove(row.id)}
                                className="rounded-md border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              {row.status === 'pending' ? (
                                <button
                                  type="button"
                                  disabled={actionId === row.id}
                                  onClick={() => handleReject(row.id)}
                                  className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              ) : null}
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={actionId === row.id}
                              onClick={() => handleToggleStatus(row)}
                              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {row.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          )}
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

      {infoAffiliateId ? (
        <AffiliateInfoModal
          affiliateId={infoAffiliateId}
          onClose={() => setInfoAffiliateId(null)}
          showToast={showToast}
        />
      ) : null}

      {balanceAffiliate ? (
        <BalanceAdjustModal
          affiliate={balanceAffiliate}
          onClose={() => setBalanceAffiliate(null)}
          onSuccess={loadAffiliates}
          showToast={showToast}
        />
      ) : null}

      {addOpen ? (
        <AddAffiliateModal
          onClose={() => setAddOpen(false)}
          onSuccess={loadAffiliates}
          showToast={showToast}
        />
      ) : null}
    </>
  );
}
