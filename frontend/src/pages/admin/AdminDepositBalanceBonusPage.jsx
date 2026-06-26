import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Gift,
  Pencil,
  Plus,
  Power,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import {
  cancelAdminDepositBonusUser,
  createAdminDepositBonusRule,
  deleteAdminDepositBonusRule,
  fetchAdminDepositBonusRules,
  fetchAdminDepositBonusUsers,
  updateAdminDepositBonusRule,
} from '../../services/adminDepositBonusService';

const EMPTY_FORM = {
  title: '',
  bonusPercent: '',
  turnoverMultiplier: '1',
  minDeposit: '0',
  maxDeposit: '',
  claimLimit: '1',
  isActive: true,
};

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US');
}

function accountStatusClass(status) {
  if (status === 'completed' || status === 'claimed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'expired' || status === 'cancelled') return 'bg-red-100 text-red-600';
  return 'bg-amber-100 text-amber-700';
}

function accountStatusLabel(status) {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'completed') return 'Completed';
  if (status === 'claimed') return 'Claimed';
  if (status === 'expired') return 'Expired';
  if (status === 'cancelled') return 'Cancelled';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function progressBarClass(status) {
  if (status === 'completed' || status === 'claimed') return 'bg-emerald-500';
  if (status === 'expired' || status === 'cancelled') return 'bg-red-400';
  return 'bg-amber-500';
}

function formatProgressText(row) {
  const completed = Number(row.completedTurnover || 0);
  const required = Number(row.requiredTurnover || 0);
  const percent = Number(row.progress ?? row.progressPercent ?? 0).toFixed(0);
  return `৳${formatMoney(completed)} / ৳${formatMoney(required)} (${percent}%)`;
}

function SummaryCard({ label, value, icon: Icon, className }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium opacity-80">{label}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
        </div>
        <div className="rounded-xl bg-white/60 p-2">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function AdminDepositBalanceBonusPage() {
  const [rules, setRules] = useState([]);
  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [actionId, setActionId] = useState(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesResult, usersResult] = await Promise.all([
        fetchAdminDepositBonusRules(),
        fetchAdminDepositBonusUsers(),
      ]);
      setRules(rulesResult.rules || []);
      setSummary(rulesResult.summary || null);
      setAccounts(usersResult.accounts || []);
    } catch (error) {
      showToast(error.message || 'Failed to load deposit bonus data');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (rule) => {
    setEditingId(rule.id);
    setForm({
      title: rule.title || '',
      bonusPercent: String(rule.bonusPercent ?? ''),
      turnoverMultiplier: String(rule.turnoverMultiplier ?? 1),
      minDeposit: String(rule.minDeposit ?? 0),
      maxDeposit: String(rule.maxDeposit ?? ''),
      claimLimit: String(rule.claimLimit ?? 1),
      isActive: rule.isActive,
    });
    setModalOpen(true);
  };

  const handleSaveRule = async () => {
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        bonusPercent: Number(form.bonusPercent),
        turnoverMultiplier: Number(form.turnoverMultiplier),
        minDeposit: Number(form.minDeposit),
        maxDeposit: Number(form.maxDeposit),
        claimLimit: Number(form.claimLimit),
        isActive: form.isActive,
      };

      if (editingId) {
        await updateAdminDepositBonusRule(editingId, payload);
        showToast('Rule updated successfully', 'success');
      } else {
        await createAdminDepositBonusRule(payload);
        showToast('Rule created successfully', 'success');
      }

      setModalOpen(false);
      await load();
    } catch (error) {
      showToast(error.message || 'Failed to save rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (rule) => {
    try {
      await updateAdminDepositBonusRule(rule.id, { ...rule, isActive: !rule.isActive });
      showToast(`Rule ${rule.isActive ? 'deactivated' : 'activated'}`, 'success');
      await load();
    } catch (error) {
      showToast(error.message || 'Failed to update rule');
    }
  };

  const handleDeleteRule = async (rule) => {
    if (!window.confirm(`Delete rule "${rule.title}"?`)) return;
    try {
      await deleteAdminDepositBonusRule(rule.id);
      showToast('Rule deleted', 'success');
      await load();
    } catch (error) {
      showToast(error.message || 'Failed to delete rule');
    }
  };

  const handleCancelAccount = async (id) => {
    if (!window.confirm('Cancel this bonus account? Bonus amount will be removed from user balance.')) {
      return;
    }
    setActionId(id);
    try {
      await cancelAdminDepositBonusUser(id);
      showToast('Bonus account cancelled', 'success');
      await load();
    } catch (error) {
      showToast(error.message || 'Failed to cancel bonus account');
    } finally {
      setActionId(null);
    }
  };

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="admin-deposit-balance-bonus-page space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Gift className="text-violet-600" size={24} />
            <h2 className="text-[28px] font-bold tracking-tight text-slate-900">
              Deposit Balance Bonus (% of Deposit)
            </h2>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            <Plus size={16} />
            Create New Rule
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Rules"
            value={summary?.totalRules ?? (loading ? '…' : 0)}
            icon={ClipboardList}
            className="border-blue-100 bg-blue-50 text-blue-700"
          />
          <SummaryCard
            label="Active Rules"
            value={summary?.activeRules ?? (loading ? '…' : 0)}
            icon={CheckCircle2}
            className="border-emerald-100 bg-emerald-50 text-emerald-700"
          />
          <SummaryCard
            label="Active User Bonuses"
            value={summary?.activeUserBonuses ?? (loading ? '…' : 0)}
            icon={Users}
            className="border-orange-100 bg-orange-50 text-orange-700"
          />
          <SummaryCard
            label="Total Active Bonus Amount"
            value={`৳${formatMoney(summary?.totalActiveBonusAmount)}`}
            icon={Wallet}
            className="border-pink-100 bg-pink-50 text-pink-700"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="bg-violet-600 px-5 py-3">
            <div className="flex items-center gap-2 text-white">
              <Gift size={18} />
              <h3 className="font-semibold">Bonus Turnover Rules</h3>
            </div>
          </div>
          <div className="p-5">
            {loading ? (
              <p className="text-sm text-slate-500">Loading rules...</p>
            ) : rules.length === 0 ? (
              <p className="text-sm text-slate-500">No bonus rules yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{rule.title}</p>
                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          DEPOSIT_PERCENT
                        </p>
                      </div>
                      <span
                        className={[
                          'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          rule.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600',
                        ].join(' ')}
                      >
                        {rule.status}
                      </span>
                    </div>
                    <div className="mt-4 space-y-1 text-sm text-slate-700">
                      <p>Bonus: {rule.bonusPercent}%</p>
                      <p>Turnover: {rule.turnoverMultiplier}X</p>
                      <p>Min Deposit: ৳{formatMoney(rule.minDeposit)}</p>
                      <p>Max Deposit: ৳{formatMoney(rule.maxDeposit)}</p>
                      <p>User Claim Limit: {rule.claimLimit}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(rule)}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(rule)}
                        className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
                      >
                        <Power size={12} />
                        {rule.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule)}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="bg-violet-600 px-5 py-3">
            <div className="flex items-center gap-2 text-white">
              <Users size={18} />
              <h3 className="font-semibold">Active User Bonus Accounts</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Deposit</th>
                  <th className="px-4 py-3">Bonus %</th>
                  <th className="px-4 py-3">Bonus Amount</th>
                  <th className="px-4 py-3">Turnover X</th>
                  <th className="px-4 py-3">Required Turnover</th>
                  <th className="px-4 py-3">Completed</th>
                  <th className="px-4 py-3">Remaining</th>
                  <th className="px-4 py-3">Progress Bar</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-10 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-10 text-center text-slate-400">
                      No active user bonus accounts
                    </td>
                  </tr>
                ) : (
                  accounts.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">{row.id}</td>
                      <td className="px-4 py-3">{row.userPhone || '—'}</td>
                      <td className="px-4 py-3">{row.userName || '—'}</td>
                      <td className="px-4 py-3">৳{formatMoney(row.depositAmount)}</td>
                      <td className="px-4 py-3">{row.bonusPercent}%</td>
                      <td className="px-4 py-3">৳{formatMoney(row.bonusAmount)}</td>
                      <td className="px-4 py-3">{row.turnoverMultiplier}x</td>
                      <td className="px-4 py-3">৳{formatMoney(row.requiredTurnover)}</td>
                      <td className="px-4 py-3">৳{formatMoney(row.completedTurnover)}</td>
                      <td className="px-4 py-3">৳{formatMoney(row.remainingTurnover)}</td>
                      <td className="px-4 py-3">
                        <div className="min-w-[180px]">
                          <p className="mb-1 text-xs text-slate-600">{formatProgressText(row)}</p>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${progressBarClass(row.status)}`}
                              style={{ width: `${Math.min(100, row.progress ?? row.progressPercent ?? 0)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            accountStatusClass(row.status),
                          ].join(' ')}
                        >
                          {accountStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-3">
                        {row.status === 'in_progress' ? (
                          <button
                            type="button"
                            disabled={actionId === row.id}
                            onClick={() => handleCancelAccount(row.id)}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {modalOpen && (
          <div className="admin-deposit-balance-bonus-modal fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingId ? 'Edit Bonus Rule' : 'Create New Rule'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4 p-5">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Title</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                    placeholder="5% Deposit Balance Bonus (1X)"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Bonus %</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.bonusPercent}
                      onChange={(e) => setForm((c) => ({ ...c, bonusPercent: e.target.value }))}
                      placeholder="5"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Turnover X</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.turnoverMultiplier}
                      onChange={(e) => setForm((c) => ({ ...c, turnoverMultiplier: e.target.value }))}
                      placeholder="1"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Min Deposit</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.minDeposit}
                      onChange={(e) => setForm((c) => ({ ...c, minDeposit: e.target.value }))}
                      placeholder="0"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Max Deposit</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.maxDeposit}
                      onChange={(e) => setForm((c) => ({ ...c, maxDeposit: e.target.value }))}
                      placeholder="999999"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Claim Limit</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.claimLimit}
                      onChange={(e) => setForm((c) => ({ ...c, claimLimit: e.target.value }))}
                      placeholder="1"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="flex items-center gap-3 pt-7">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                    />
                    <span className="text-sm font-medium text-slate-700">Active</span>
                  </label>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSaveRule}
                    className="w-full rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60 sm:w-auto"
                  >
                    {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Rule'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
