import { useCallback, useEffect, useState } from 'react';
import { Eye, Gift, Pencil, Plus, RotateCcw, Save, Trash2, Users, X } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import {
  cancelAdminBonusProgress,
  fetchAdminBonusProgress,
  fetchAdminBonusProgressDetail,
  resetAdminBonusProgress,
} from '../../services/adminBonusProgressService';
import {
  createAdminBonusTurnoverRule,
  deleteAdminBonusTurnoverRule,
  fetchAdminBonusTurnoverRules,
  updateAdminBonusTurnoverRule,
} from '../../services/adminBonusTurnoverService';

const EMPTY_FORM = {
  title: '',
  bonusPercent: '',
  minDeposit: '',
  maxDeposit: '',
  userClaimLimit: '1',
  turnoverMultiplier: '1',
  startAt: '',
  endAt: '',
  description: '',
  isActive: true,
};

function ToggleSwitch({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors',
        checked ? 'bg-emerald-500' : 'bg-slate-300',
        disabled ? 'opacity-50' : '',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function toDateTimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function statusClass(status) {
  if (status === 'Active') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Expired') return 'bg-red-100 text-red-700';
  if (status === 'Scheduled') return 'bg-sky-100 text-sky-700';
  return 'bg-slate-100 text-slate-600';
}

function progressStatusClass(status) {
  if (status === 'completed' || status === 'claimed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'expired' || status === 'cancelled') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
}

function progressStatusLabel(status) {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'completed') return 'Completed';
  if (status === 'claimed') return 'Claimed';
  if (status === 'expired') return 'Expired';
  if (status === 'cancelled') return 'Cancelled';
  return status;
}

function progressBarColor(status) {
  if (status === 'completed' || status === 'claimed') return 'bg-emerald-500';
  if (status === 'expired' || status === 'cancelled') return 'bg-red-400';
  return 'bg-amber-500';
}

function formatProgressText(row) {
  const completed = Number(row.completedTurnover || 0);
  const required = Number(row.requiredTurnover || 0);
  const percent = Number(row.progressPercent || 0).toFixed(0);
  return `৳${formatMoney(completed)} / ৳${formatMoney(required)} (${percent}%)`;
}

export default function AdminBonusTurnoverPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [rules, setRules] = useState([]);
  const [progressRows, setProgressRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [detailRecord, setDetailRecord] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminBonusTurnoverRules();
      setRules(result.data || []);
    } catch (error) {
      showToast(error.message || 'Failed to load bonus rules');
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadProgress = useCallback(async () => {
    setProgressLoading(true);
    try {
      const result = await fetchAdminBonusProgress();
      setProgressRows(result.records || []);
    } catch (error) {
      showToast(error.message || 'Failed to load bonus progress');
      setProgressRows([]);
    } finally {
      setProgressLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadRules();
    loadProgress();
  }, [loadRules, loadProgress]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleEdit = (rule) => {
    setEditingId(rule.id);
    setForm({
      title: rule.title || '',
      bonusPercent: String(rule.bonusPercent ?? ''),
      minDeposit: String(rule.minDeposit ?? ''),
      maxDeposit: String(rule.maxDeposit ?? ''),
      userClaimLimit: String(rule.userClaimLimit ?? 1),
      turnoverMultiplier: String(rule.turnoverMultiplier ?? 1),
      startAt: toDateTimeLocalValue(rule.startAt),
      endAt: toDateTimeLocalValue(rule.endAt),
      description: rule.description || '',
      isActive: rule.isActive,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buildPayload = () => ({
    title: form.title.trim(),
    bonusPercent: Number(form.bonusPercent),
    minDeposit: Number(form.minDeposit),
    maxDeposit: Number(form.maxDeposit),
    userClaimLimit: Number(form.userClaimLimit),
    turnoverMultiplier: Number(form.turnoverMultiplier),
    startAt: form.startAt,
    endAt: form.endAt,
    description: form.description.trim(),
    isActive: form.isActive,
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (editingId) {
        await updateAdminBonusTurnoverRule(editingId, payload);
        showToast('Bonus rule saved successfully', 'success');
      } else {
        await createAdminBonusTurnoverRule(payload);
        showToast('Bonus rule created successfully', 'success');
      }
      resetForm();
      await loadRules();
    } catch (error) {
      showToast(error.message || 'Failed to save bonus rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (rule) => {
    try {
      await updateAdminBonusTurnoverRule(rule.id, {
        title: rule.title,
        bonusPercent: rule.bonusPercent,
        minDeposit: rule.minDeposit,
        maxDeposit: rule.maxDeposit,
        userClaimLimit: rule.userClaimLimit,
        turnoverMultiplier: rule.turnoverMultiplier,
        startAt: rule.startAt,
        endAt: rule.endAt,
        description: rule.description,
        isActive: !rule.isActive,
      });
      showToast(`Bonus rule ${rule.isActive ? 'disabled' : 'enabled'}`, 'success');
      await loadRules();
    } catch (error) {
      showToast(error.message || 'Failed to update bonus rule status');
    }
  };

  const handleDelete = async (rule) => {
    if (!window.confirm(`Delete bonus rule "${rule.title}"?`)) return;

    try {
      await deleteAdminBonusTurnoverRule(rule.id);
      showToast('Bonus rule deleted successfully', 'success');
      if (editingId === rule.id) resetForm();
      await loadRules();
    } catch (error) {
      showToast(error.message || 'Failed to delete bonus rule');
    }
  };

  const handleViewDetails = async (id) => {
    try {
      const result = await fetchAdminBonusProgressDetail(id);
      setDetailRecord(result.record);
      setDetailOpen(true);
    } catch (error) {
      showToast(error.message || 'Failed to load bonus details');
    }
  };

  const handleCancelProgress = async (id) => {
    if (!window.confirm('Cancel this bonus? Bonus amount will be removed from user balance.')) return;
    setActionId(id);
    try {
      await cancelAdminBonusProgress(id);
      showToast('Bonus cancelled successfully', 'success');
      await loadProgress();
    } catch (error) {
      showToast(error.message || 'Failed to cancel bonus');
    } finally {
      setActionId(null);
    }
  };

  const handleResetProgress = async (id) => {
    if (!window.confirm('Reset turnover progress for this bonus?')) return;
    setActionId(id);
    try {
      await resetAdminBonusProgress(id);
      showToast('Bonus progress reset successfully', 'success');
      await loadProgress();
    } catch (error) {
      showToast(error.message || 'Failed to reset bonus progress');
    } finally {
      setActionId(null);
    }
  };

  const busy = submitting || loading;

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="admin-bonus-turnover-page space-y-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Gift className="text-emerald-500" size={22} strokeWidth={2.2} />
            <h2 className="text-[28px] font-bold tracking-tight text-slate-900">
              Bonus Turnover Configuration
            </h2>
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            Configure deposit bonus rules with turnover requirements for players.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            {editingId ? 'Edit Bonus Rule' : 'Create Bonus Rule'}
          </h3>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Bonus Title</span>
              <input
                type="text"
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                disabled={busy}
                placeholder="100% First Deposit Bonus"
                className="admin-bonus-turnover-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Bonus Percentage (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.bonusPercent}
                onChange={(event) => updateField('bonusPercent', event.target.value)}
                disabled={busy}
                placeholder="100"
                className="admin-bonus-turnover-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Turnover Multiplier</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.turnoverMultiplier}
                onChange={(event) => updateField('turnoverMultiplier', event.target.value)}
                disabled={busy}
                placeholder="5"
                className="admin-bonus-turnover-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Minimum Deposit Amount (৳)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.minDeposit}
                onChange={(event) => updateField('minDeposit', event.target.value)}
                disabled={busy}
                placeholder="500"
                className="admin-bonus-turnover-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Maximum Deposit Amount (৳)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.maxDeposit}
                onChange={(event) => updateField('maxDeposit', event.target.value)}
                disabled={busy}
                placeholder="10000"
                className="admin-bonus-turnover-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">User Claim Limit</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.userClaimLimit}
                onChange={(event) => updateField('userClaimLimit', event.target.value)}
                disabled={busy}
                className="admin-bonus-turnover-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Start Date &amp; Time</span>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(event) => updateField('startAt', event.target.value)}
                disabled={busy}
                className="admin-bonus-turnover-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">End Date &amp; Time</span>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(event) => updateField('endAt', event.target.value)}
                disabled={busy}
                className="admin-bonus-turnover-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Description / Terms</span>
              <textarea
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                disabled={busy}
                rows={4}
                placeholder="Bonus terms and conditions..."
                className="admin-bonus-turnover-input w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            <div className="flex items-center gap-3 md:col-span-2">
              <ToggleSwitch
                checked={form.isActive}
                onChange={(value) => updateField('isActive', value)}
                disabled={busy}
              />
              <span className="text-sm font-medium text-slate-700">Active</span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {editingId ? <Save size={16} /> : <Plus size={16} />}
              {submitting
                ? 'Saving...'
                : editingId
                  ? 'Save Changes'
                  : 'Create Bonus Rule'}
            </button>

            {editingId ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDelete({ id: editingId, title: form.title })}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={16} />
                Delete
              </button>
            ) : null}

            {editingId ? (
              <button
                type="button"
                disabled={busy}
                onClick={resetForm}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Existing Bonus Rules</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Bonus %</th>
                  <th className="px-4 py-3">Deposit Range</th>
                  <th className="px-4 py-3">Claim Limit</th>
                  <th className="px-4 py-3">Turnover x</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-400">Loading...</td>
                  </tr>
                ) : rules.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-400">No bonus rules yet.</td>
                  </tr>
                ) : (
                  rules.map((rule) => (
                    <tr key={rule.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{rule.title}</td>
                      <td className="px-4 py-3">{rule.bonusPercent}%</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        ৳{formatMoney(rule.minDeposit)} – ৳{formatMoney(rule.maxDeposit)}
                      </td>
                      <td className="px-4 py-3">{rule.userClaimLimit}</td>
                      <td className="px-4 py-3">{rule.turnoverMultiplier}x</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(rule.startAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(rule.endAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass(rule.status)}`}>
                          {rule.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(rule)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil size={13} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(rule)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                          >
                            {rule.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(rule)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-violet-600 px-5 py-4">
            <div className="flex items-center gap-2 text-white">
              <Users size={18} />
              <h3 className="text-lg font-semibold">Active User Bonus Progress</h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">User ID</th>
                  <th className="px-4 py-3">User Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Deposit Amount</th>
                  <th className="px-4 py-3">Bonus %</th>
                  <th className="px-4 py-3">Bonus Amount</th>
                  <th className="px-4 py-3">Total Required Turnover</th>
                  <th className="px-4 py-3">Completed Turnover</th>
                  <th className="px-4 py-3">Remaining Turnover</th>
                  <th className="px-4 py-3">Progress Bar (%)</th>
                  <th className="px-4 py-3">Claim Count</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created Date</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {progressLoading ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-10 text-center text-slate-400">Loading...</td>
                  </tr>
                ) : progressRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-10 text-center text-slate-400">
                      No user bonus progress records yet.
                    </td>
                  </tr>
                ) : (
                  progressRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-3">{row.userId}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.userName || '—'}</td>
                      <td className="px-4 py-3">{row.userPhone || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">৳{formatMoney(row.depositAmount)}</td>
                      <td className="px-4 py-3">{row.bonusPercent}%</td>
                      <td className="px-4 py-3 whitespace-nowrap">৳{formatMoney(row.bonusAmount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">৳{formatMoney(row.requiredTurnover)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">৳{formatMoney(row.completedTurnover)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">৳{formatMoney(row.remainingTurnover)}</td>
                      <td className="px-4 py-3">
                        <div className="min-w-[180px]">
                          <p className="mb-1 text-xs text-slate-600">{formatProgressText(row)}</p>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${progressBarColor(row.status)}`}
                              style={{ width: `${Math.min(100, row.progressPercent || 0)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{row.claimCount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${progressStatusClass(row.status)}`}
                        >
                          {progressStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => handleViewDetails(row.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                          >
                            <Eye size={12} />
                            View Details
                          </button>
                          {row.status === 'in_progress' ? (
                            <>
                              <button
                                type="button"
                                disabled={actionId === row.id}
                                onClick={() => handleCancelProgress(row.id)}
                                className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
                              >
                                Cancel Bonus
                              </button>
                              <button
                                type="button"
                                disabled={actionId === row.id}
                                onClick={() => handleResetProgress(row.id)}
                                className="inline-flex items-center gap-1 rounded-md border border-orange-200 px-2 py-1 text-xs text-orange-700 hover:bg-orange-50 disabled:opacity-60"
                              >
                                <RotateCcw size={12} />
                                Reset Progress
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {detailOpen && detailRecord ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-lg font-bold text-slate-900">Bonus Progress Details</h3>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 p-5 text-sm text-slate-700">
              <p><span className="font-medium">User:</span> {detailRecord.userName} ({detailRecord.userPhone})</p>
              <p><span className="font-medium">Deposit:</span> ৳{formatMoney(detailRecord.depositAmount)}</p>
              <p><span className="font-medium">Bonus:</span> {detailRecord.bonusPercent}% = ৳{formatMoney(detailRecord.bonusAmount)}</p>
              <p><span className="font-medium">Turnover Multiplier:</span> {detailRecord.turnoverMultiplier}x</p>
              <p><span className="font-medium">Required Turnover:</span> ৳{formatMoney(detailRecord.requiredTurnover)}</p>
              <p><span className="font-medium">Completed:</span> ৳{formatMoney(detailRecord.completedTurnover)}</p>
              <p><span className="font-medium">Remaining:</span> ৳{formatMoney(detailRecord.remainingTurnover)}</p>
              <p><span className="font-medium">Claim Count:</span> {detailRecord.claimCount}</p>
              <p>
                <span className="font-medium">Status:</span>{' '}
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${progressStatusClass(detailRecord.status)}`}>
                  {progressStatusLabel(detailRecord.status)}
                </span>
              </p>
              <div>
                <p className="mb-1 font-medium">Progress</p>
                <p className="text-xs text-slate-500">{formatProgressText(detailRecord)}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${progressBarColor(detailRecord.status)}`}
                    style={{ width: `${Math.min(100, detailRecord.progressPercent || 0)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
