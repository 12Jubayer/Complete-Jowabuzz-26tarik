import { useCallback, useEffect, useMemo, useState } from 'react';
import { PlayCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminToast from '../../components/admin/AdminToast';
import {
  completeAdminSettlement,
  fetchAdminSettlements,
  fetchCommissionSettings,
  rejectAdminSettlement,
  runAdminSettlement,
} from '../../services/adminAffiliateService';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatStatus(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'pending') return 'Pending';
  if (value === 'rejected') return 'Rejected';
  if (value === 'released' || value === 'completed' || value === 'settled') return 'Settled';
  return status || 'Pending';
}

function statusClass(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'released' || value === 'completed' || value === 'settled') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (value === 'rejected') return 'bg-red-50 text-red-600 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function formatSettlementType(row) {
  const type = String(row.settlementType || '').toLowerCase();
  if (type === 'daily') return 'Daily';
  if (type === 'weekly') return 'Weekly';
  const start = formatDate(row.startDate || row.weekStart);
  const end = formatDate(row.endDate || row.weekEnd);
  return start && start === end ? 'Daily' : 'Weekly';
}

function getPeriodLabel(row, settings) {
  const type = String(row.settlementType || '').toLowerCase();
  const start = formatDate(row.startDate || row.weekStart);
  const end = formatDate(row.endDate || row.weekEnd);

  if (type === 'daily' || (start && start === end)) {
    return { primary: start || row.weekRange || '—', secondary: '' };
  }

  const weekRange = row.weekRange
    || (settings && Number.isInteger(settings.settlementDay)
      ? `${WEEKDAYS[(settings.settlementDay + 1) % 7]} → ${WEEKDAYS[settings.settlementDay]}`
      : row.settlementName || 'Weekly');

  const dateRange = row.dateRange || (start && end ? `${start} – ${end}` : '');
  return { primary: weekRange, secondary: dateRange };
}

function formatCreditTo(row) {
  const credit = row.creditTo;
  if (!credit?.userId) return '—';
  return `User #${credit.userId} / ${credit.userName || '—'} / Balance: ৳${formatMoney(credit.balance)}`;
}

function ConfirmApproveModal({ row, onCancel, onConfirm, loading }) {
  if (!row) return null;

  const amount = Number(row.totalCommission ?? row.amount ?? 0);
  const credit = row.creditTo;
  const userLabel = credit?.userId ? `User #${credit.userId}` : 'linked user';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900">Confirm Approval</h3>
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Are you sure? ৳{formatMoney(amount)} will be added to {userLabel} main balance.
        </p>
        {credit ? (
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Credit To: User #{credit.userId} / {credit.userName} / Current Balance: ৳{formatMoney(credit.balance)}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? 'Approving...' : 'Approve & Credit'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAffiliateSettlementPage() {
  const [settlements, setSettlements] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [approving, setApproving] = useState(false);
  const [confirmRow, setConfirmRow] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');

  const showToast = (message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settlementData, settingsData] = await Promise.all([
        fetchAdminSettlements(),
        fetchCommissionSettings(),
      ]);
      setSettlements(settlementData.settlements || []);
      setSettings(settingsData);
    } catch (error) {
      showToast(error.message || 'Failed to load settlements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return settlements;
    if (filter === 'released') {
      return settlements.filter((row) => ['released', 'completed', 'settled'].includes(String(row.status).toLowerCase()));
    }
    return settlements.filter((row) => String(row.status).toLowerCase() === filter);
  }, [filter, settlements]);

  const isSettledView = filter === 'released';

  const preview = settings
    ? settings.settlementType === 'daily'
      ? { label: 'Daily — previous day at 12:05 AM', auto: settings.autoSettlement }
      : {
          label: `${WEEKDAYS[(settings.settlementDay + 1) % 7]} → ${WEEKDAYS[settings.settlementDay]}`,
          auto: settings.autoSettlement,
        }
    : null;

  const handleRunSettlement = async () => {
    setRunning(true);
    try {
      await runAdminSettlement({ mode: 'manual' });
      showToast('Pending settlement generated for current period', 'success');
      await load();
    } catch (error) {
      showToast(error.message || 'Settlement failed');
    } finally {
      setRunning(false);
    }
  };

  const handleApproveConfirm = async () => {
    if (!confirmRow) return;
    setApproving(true);
    try {
      const result = await completeAdminSettlement(confirmRow.id, confirmRow.source || 'period');
      const credited = result.creditedUserId || confirmRow.creditTo?.userId;
      const amount = Number(result.amount ?? confirmRow.totalCommission ?? 0);
      showToast(
        credited
          ? `৳${formatMoney(amount)} credited to User #${credited}`
          : 'Settlement approved',
        'success',
      );
      setConfirmRow(null);
      await load();
    } catch (error) {
      showToast(error.message || 'Failed to approve settlement');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (row) => {
    try {
      await rejectAdminSettlement(row.id, row.source || 'period');
      showToast('Settlement rejected', 'success');
      await load();
    } catch (error) {
      showToast(error.message || 'Failed to reject settlement');
    }
  };

  return (
    <>
      <AdminToast message={toast} type={toastType} />
      <ConfirmApproveModal
        row={confirmRow}
        onCancel={() => setConfirmRow(null)}
        onConfirm={handleApproveConfirm}
        loading={approving}
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Affiliate Settlement / Withdraw Pending</h2>
            <p className="mt-1 text-sm text-slate-500">
              Commission = eligible referral deposit × commission %. Configure from{' '}
              <Link to="/admin/affiliate-settlement-settings" className="font-semibold text-violet-600 underline">
                Settlement Settings
              </Link>
              .
            </p>
            {preview ? (
              <p className="mt-2 text-sm font-medium text-slate-700">
                Current: {settings?.settlementType === 'daily' ? 'Daily' : 'Weekly'} ({preview.label}) | Auto Pending: {preview.auto ? 'Active (12:05 AM)' : 'Inactive'}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleRunSettlement}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            <PlayCircle size={16} />
            {running ? 'Running...' : 'Run Settlement Now'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'pending', label: 'Pending' },
            { id: 'released', label: 'Settled' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'all', label: 'All' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={[
                'rounded-full px-3 py-1.5 text-xs font-semibold',
                filter === item.id ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Affiliate</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Total Referral</th>
                  <th className="px-4 py-3">Total Eligible Deposit</th>
                  <th className="px-4 py-3">Commission %</th>
                  <th className="px-4 py-3">Commission Amount</th>
                  <th className="px-4 py-3">Credit To</th>
                  {isSettledView ? (
                    <>
                      <th className="px-4 py-3">Balance Before</th>
                      <th className="px-4 py-3">Balance After</th>
                      <th className="px-4 py-3">Approved By</th>
                      <th className="px-4 py-3">Approved At</th>
                    </>
                  ) : null}
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={isSettledView ? 14 : 10} className="px-4 py-10 text-center text-slate-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={isSettledView ? 14 : 10} className="px-4 py-10 text-center text-slate-400">No records found</td></tr>
                ) : (
                  filtered.map((row) => {
                    const period = getPeriodLabel(row, settings);
                    const commissionAmount = Number(row.totalCommission ?? row.amount ?? 0);
                    const showZeroReason = commissionAmount <= 0 && row.zeroReason;

                    return (
                      <tr key={`${row.source || 'period'}-${row.id}`} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <div className="font-medium">{row.affiliateName}</div>
                          <div className="text-xs text-slate-400">#{row.affiliateId} · {row.referralCode}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            {formatSettlementType(row)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{period.primary}</div>
                          {period.secondary ? (
                            <div className="text-xs text-slate-400">{period.secondary}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">{row.totalReferrals ?? '—'}</td>
                        <td className="px-4 py-3">৳{formatMoney(row.totalEligibleDeposit ?? row.profit ?? 0)}</td>
                        <td className="px-4 py-3">{row.commissionPercent != null ? `${row.commissionPercent}%` : '—'}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-violet-600">৳{formatMoney(commissionAmount)}</div>
                          {showZeroReason ? (
                            <div className="mt-1 text-[11px] text-amber-600">{row.zeroReason}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{formatCreditTo(row)}</td>
                        {isSettledView ? (
                          <>
                            <td className="px-4 py-3">৳{formatMoney(row.balanceBefore ?? 0)}</td>
                            <td className="px-4 py-3">৳{formatMoney(row.balanceAfter ?? 0)}</td>
                            <td className="px-4 py-3 text-xs">
                              {row.approvedByName || (row.approvedBy ? `#${row.approvedBy}` : '—')}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(row.approvedAt)}</td>
                          </>
                        ) : null}
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClass(row.status)}`}>
                            {formatStatus(row.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {String(row.status).toLowerCase() === 'pending' && (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setConfirmRow(row)}
                                className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(row)}
                                className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
