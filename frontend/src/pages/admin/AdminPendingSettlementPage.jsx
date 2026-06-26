import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import {
  approvePendingAffiliateSettlement,
  approvePendingAgentSettlement,
  fetchPendingAffiliateSettlements,
  fetchPendingAgentSettlements,
} from '../../services/adminPendingSettlementService';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPeriod(row, type) {
  if (type === 'agent') {
    return row.periodLabel || row.weekRange || row.dateRange || '—';
  }

  const start = row.startDate || row.weekStart;
  const end = row.endDate || row.weekEnd;
  if (start && end && String(start).slice(0, 10) === String(end).slice(0, 10)) {
    return String(start).slice(0, 10);
  }
  return row.dateRange || row.weekRange || row.settlementName || '—';
}

function formatCreditTo(row, type) {
  if (type === 'agent') {
    const credit = row.creditTo;
    if (!credit?.agentId) return '—';
    return `Agent #${credit.agentId} / ${credit.agentName || '—'} / Balance: ৳${formatMoney(credit.balance)}`;
  }

  const credit = row.creditTo;
  if (!credit?.userId) return '—';
  return `User #${credit.userId} / ${credit.userName || '—'} / Balance: ৳${formatMoney(credit.balance)}`;
}

function normalizeRow(row, type) {
  const entityId = type === 'agent' ? row.agentId : row.affiliateId;
  const name = type === 'agent' ? row.agentName : row.affiliateName;
  const amount = Number(row.totalCommission ?? row.amount ?? 0);

  return {
    key: `${type}-${row.id}`,
    settlementId: row.id,
    source: row.source || 'period',
    entityId,
    name: name || '—',
    type: type === 'agent' ? 'Agent' : 'Affiliate',
    period: formatPeriod(row, type),
    amount,
    creditTo: formatCreditTo(row, type),
    status: 'Pending',
    raw: row,
  };
}

function ConfirmApproveModal({ row, onCancel, onConfirm, loading }) {
  if (!row) return null;

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
          Approve ৳{formatMoney(row.amount)} for <span className="font-semibold">{row.name}</span> ({row.type})?
        </p>
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Credit To: {row.creditTo}
        </p>
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
            {loading ? 'Approving...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPendingSettlementPage() {
  const [tab, setTab] = useState('agent');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [confirmRow, setConfirmRow] = useState(null);
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
      const data =
        tab === 'agent'
          ? await fetchPendingAgentSettlements()
          : await fetchPendingAffiliateSettlements();
      setRows(data.map((row) => normalizeRow(row, tab)));
    } catch (error) {
      showToast(error.message || 'Failed to load pending settlements');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [showToast, tab]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApproveConfirm = async () => {
    if (!confirmRow) return;
    setApproving(true);
    try {
      if (tab === 'agent') {
        const result = await approvePendingAgentSettlement(confirmRow.settlementId);
        showToast(result.message || 'Agent settlement approved', 'success');
      } else {
        const result = await approvePendingAffiliateSettlement(
          confirmRow.settlementId,
          confirmRow.source,
        );
        const credited = result.creditedUserId;
        const amount = Number(result.amount ?? confirmRow.amount ?? 0);
        showToast(
          credited
            ? `৳${formatMoney(amount)} credited to User #${credited}`
            : result.message || 'Affiliate settlement approved',
          'success',
        );
      }
      setConfirmRow(null);
      await load();
    } catch (error) {
      showToast(error.message || 'Failed to approve settlement');
    } finally {
      setApproving(false);
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
        <div>
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Pending Settlement</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review and approve pending agent and affiliate settlements from one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'agent', label: 'Agent' },
            { id: 'affiliate', label: 'Affiliate' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={[
                'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                tab === item.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
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
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Credit To</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                      No pending {tab} settlements.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.key} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                      <td className="px-4 py-3">#{row.entityId}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.period}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">৳{formatMoney(row.amount)}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{row.creditTo}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setConfirmRow(row)}
                          className="rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
