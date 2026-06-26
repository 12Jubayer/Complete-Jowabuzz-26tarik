import { useCallback, useEffect, useState } from 'react';
import { Download, Eye, PlayCircle, Save, Wallet, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminToast from '../../components/admin/AdminToast';
import {
  approveAdminAgentCommissionSettlement,
  downloadAdminAgentCommissionExport,
  fetchAdminAgentCommissionAgents,
  fetchAdminAgentCommissionSettings,
  fetchAdminAgentCommissionSettlementDetails,
  fetchAdminAgentCommissionSettlements,
  fetchAdminAgentCommissionSummary,
  fetchAdminAgentCommissionTransactions,
  generateAdminAgentCommissionSettlements,
  rejectAdminAgentCommissionSettlement,
  saveAdminAgentCommissionSettings,
} from '../../services/adminAgentCommissionService';

const TABS = [
  { id: 'agents', label: 'Agents' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'settlement', label: 'Settlement' },
  { id: 'settings', label: 'Settings' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdraw', label: 'Withdraw' },
];

const SETTLEMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Settled' },
  { value: 'rejected', label: 'Rejected' },
];

function formatSettlementType() {
  return 'Monthly';
}

function formatCreditTo(row) {
  const credit = row.creditTo;
  if (!credit) return 'Agent Wallet';
  return `Agent Wallet / #${credit.agentId} / ${credit.agentName || '—'} / Balance: ৳${formatMoney(credit.balance)}`;
}

function settlementPeriodPrimary(row) {
  if (row.weekRange) return row.weekRange;
  return row.periodLabel || '—';
}

function settlementPeriodSecondary(row) {
  return row.dateRange || '';
}

function displaySettlementStatus(status) {
  if (status === 'approved' || status === 'settled') return 'Settled';
  if (status === 'pending') return 'Pending';
  if (status === 'rejected') return 'Rejected';
  return status;
}

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

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function roleLabel(role) {
  if (!role) return 'Agent';
  if (role === 'super_agent') return 'Super_agent';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function settlementStatusClass(status) {
  if (status === 'approved' || status === 'settled') return 'bg-emerald-100 text-emerald-700';
  if (status === 'rejected') return 'bg-red-100 text-red-600';
  return 'bg-amber-100 text-amber-700';
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
        active
          ? 'bg-emerald-500 text-white shadow-sm'
          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function SummaryCard({ label, value, highlight = false }) {
  return (
    <div
      className={[
        'rounded-2xl border p-4 shadow-sm',
        highlight
          ? 'border-emerald-100 bg-emerald-50'
          : 'border-slate-100 bg-white',
      ].join(' ')}
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p
        className={[
          'mt-2 text-2xl font-bold',
          highlight ? 'text-emerald-700' : 'text-slate-900',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  );
}

export default function AdminAgentCommissionPage() {
  const [tab, setTab] = useState('agents');
  const [summary, setSummary] = useState(null);
  const [agents, setAgents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [settlementStatusFilter, setSettlementStatusFilter] = useState('all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [settlementDetails, setSettlementDetails] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [confirmSettlement, setConfirmSettlement] = useState(null);
  const [depositPercent, setDepositPercent] = useState('5');
  const [withdrawPercent, setWithdrawPercent] = useState('2');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState('');
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');

  const debouncedSearch = useDebouncedValue(search);

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const loadSummary = useCallback(async () => {
    const result = await fetchAdminAgentCommissionSummary();
    setSummary(result.summary);
  }, []);

  const loadSettings = useCallback(async () => {
    const result = await fetchAdminAgentCommissionSettings();
    setDepositPercent(String(result.settings?.depositPercent ?? 5));
    setWithdrawPercent(String(result.settings?.withdrawPercent ?? 2));
  }, []);

  const loadAgents = useCallback(async () => {
    const result = await fetchAdminAgentCommissionAgents(debouncedSearch);
    setAgents(result.agents || []);
  }, [debouncedSearch]);

  const loadTransactions = useCallback(async () => {
    const result = await fetchAdminAgentCommissionTransactions({
      search: debouncedSearch,
      type: typeFilter,
    });
    setTransactions(result.transactions || []);
  }, [debouncedSearch, typeFilter]);

  const loadSettlements = useCallback(async () => {
    const result = await fetchAdminAgentCommissionSettlements({
      search: debouncedSearch,
      status: settlementStatusFilter,
    });
    setSettlements(result.settlements || []);
  }, [debouncedSearch, settlementStatusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await loadSummary();
      if (tab === 'agents') {
        await loadAgents();
      } else if (tab === 'transactions') {
        await loadTransactions();
      } else if (tab === 'settlement') {
        await loadSettlements();
      } else {
        await loadSettings();
      }
    } catch (error) {
      showToast(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [tab, loadSummary, loadAgents, loadTransactions, loadSettlements, loadSettings, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const result = await saveAdminAgentCommissionSettings({
        depositPercent: Number(depositPercent),
        withdrawPercent: Number(withdrawPercent),
      });
      setDepositPercent(String(result.settings?.depositPercent ?? depositPercent));
      setWithdrawPercent(String(result.settings?.withdrawPercent ?? withdrawPercent));
      showToast(result.message || 'Settings saved', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      await downloadAdminAgentCommissionExport(format, {
        tab: tab === 'settings' || tab === 'settlement' ? 'agents' : tab,
        search: debouncedSearch,
        type: typeFilter,
      });
      showToast(`${format.toUpperCase()} downloaded`, 'success');
    } catch (error) {
      showToast(error.message || `Failed to export ${format.toUpperCase()}`);
    } finally {
      setExporting('');
    }
  };

  const handleGenerateSettlements = async () => {
    setGenerating(true);
    try {
      const result = await generateAdminAgentCommissionSettlements();
      showToast(result.message || 'Settlements generated', 'success');
      await loadSettlements();
    } catch (error) {
      showToast(error.message || 'Failed to generate settlements');
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveSettlement = async (row) => {
    setConfirmSettlement(row);
  };

  const handleConfirmApprove = async () => {
    if (!confirmSettlement) return;
    const id = confirmSettlement.id;
    setActionId(id);
    try {
      const result = await approveAdminAgentCommissionSettlement(id);
      const amount = Number(result.amount ?? confirmSettlement.totalCommission ?? 0);
      const agentId = result.creditedAgentId || confirmSettlement.agentId;
      showToast(
        result.message || `৳${formatMoney(amount)} credited to Agent #${agentId} wallet`,
        'success',
      );
      setConfirmSettlement(null);
      await loadSettlements();
      await loadSummary();
    } catch (error) {
      showToast(error.message || 'Failed to approve settlement');
    } finally {
      setActionId(null);
    }
  };

  const handleRejectSettlement = async (id) => {
    setActionId(id);
    try {
      const result = await rejectAdminAgentCommissionSettlement(id);
      showToast(result.message || 'Settlement rejected', 'success');
      await loadSettlements();
    } catch (error) {
      showToast(error.message || 'Failed to reject settlement');
    } finally {
      setActionId(null);
    }
  };

  const handleViewDetails = async (id) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setSettlementDetails(null);
    try {
      const result = await fetchAdminAgentCommissionSettlementDetails(id);
      setSettlementDetails(result);
    } catch (error) {
      showToast(error.message || 'Failed to load settlement details');
      setDetailsOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <>
      <AdminToast message={toast} type={toastType} />
      {confirmSettlement ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Confirm Approval</h3>
            <p className="mt-4 text-sm text-slate-600">
              Are you sure? ৳{formatMoney(confirmSettlement.totalCommission)} commission will be added to Agent Wallet.
            </p>
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Credit To: {formatCreditTo(confirmSettlement)}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmSettlement(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleConfirmApprove} disabled={actionId === confirmSettlement.id} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {actionId === confirmSettlement.id ? 'Approving...' : 'Approve & Credit'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="admin-agent-commission-page space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Agent Commission</h2>
          <div className="flex flex-wrap gap-2">
            {TABS.map((item) => (
              <TabButton key={item.id} active={tab === item.id} onClick={() => setTab(item.id)}>
                {item.label}
              </TabButton>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <SummaryCard label="Total Agents" value={summary?.agents ?? (loading ? '…' : 0)} />
          <SummaryCard label="Current Month Deposit" value={`৳${formatMoney(summary?.monthDeposit)}`} />
          <SummaryCard label="Current Month Withdraw" value={`৳${formatMoney(summary?.monthWithdraw)}`} />
          <SummaryCard label="Current Month Commission" value={`৳${formatMoney(summary?.totalCommission)}`} highlight />
          <SummaryCard label="Pending Commission" value={`৳${formatMoney(summary?.pendingCommission)}`} />
          <SummaryCard label="Settled Commission" value={`৳${formatMoney(summary?.settledCommission)}`} />
        </div>

        {tab === 'settings' ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Commission Rates</h3>
            <p className="mt-2 text-sm text-slate-600">
              এই রেট সকল এজেন্টের ডিপোজিট ও উইথড্র লেনদেনের উপর সরাসরি প্রয়োগ হবে।
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Deposit %</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={depositPercent}
                  onChange={(event) => setDepositPercent(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Withdraw %</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={withdrawPercent}
                  onChange={(event) => setWithdrawPercent(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving || loading}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              {tab === 'transactions' && (
                <label className="block min-w-[140px]">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">Type</span>
                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                  >
                    {TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {tab === 'settlement' && (
                <>
                  <Link
                    to="/admin/agent-commission/settings"
                    className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Settlement Settings
                  </Link>
                  <label className="block min-w-[140px]">
                    <span className="mb-1.5 block text-xs font-medium text-slate-500">Status</span>
                    <select
                      value={settlementStatusFilter}
                      onChange={(event) => setSettlementStatusFilter(event.target.value)}
                      className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                    >
                      {SETTLEMENT_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateSettlements}
                    disabled={generating || loading}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
                  >
                    <PlayCircle size={16} />
                    {generating ? 'Generating...' : 'Generate Settlements'}
                  </button>
                </>
              )}

              {tab !== 'settlement' && (
                <label className="block min-w-[220px] flex-1">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">Search</span>
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search..."
                    className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                  />
                </label>
              )}

              {tab === 'settlement' && (
                <label className="block min-w-[220px] flex-1">
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">Search</span>
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search agent..."
                    className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none"
                  />
                </label>
              )}

              {tab !== 'settlement' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleExport('csv')}
                    disabled={Boolean(exporting) || loading}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                  >
                    <Download size={16} />
                    {exporting === 'csv' ? 'Exporting...' : 'CSV'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('pdf')}
                    disabled={Boolean(exporting) || loading}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                  >
                    <Download size={16} />
                    {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
              ) : tab === 'agents' ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Agent</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Balance</th>
                        <th className="px-4 py-3">Month Deposit</th>
                        <th className="px-4 py-3">Month Withdraw</th>
                        <th className="px-4 py-3">Rate (D/W)</th>
                        <th className="px-4 py-3">Commission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {agents.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                            No agents found
                          </td>
                        </tr>
                      ) : (
                        agents.map((agent) => (
                          <tr key={agent.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-900">{agent.name}</p>
                              <p className="text-xs text-slate-500">{agent.mobile || '—'}</p>
                            </td>
                            <td className="px-4 py-3 capitalize text-slate-700">
                              {roleLabel(agent.role)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                                <Wallet size={14} />
                                ৳{formatMoney(agent.balance)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              ৳{formatMoney(agent.monthDeposit)}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              ৳{formatMoney(agent.monthWithdraw)}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {agent.depositRate}% / {agent.withdrawRate}%
                            </td>
                            <td className="px-4 py-3 font-semibold text-emerald-600">
                              ৳{formatMoney(agent.commission)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : tab === 'settlement' ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Agent</th>
                        <th className="px-4 py-3">Agent ID</th>
                        <th className="px-4 py-3">Period Start</th>
                        <th className="px-4 py-3">Period End</th>
                        <th className="px-4 py-3">Total Deposit</th>
                        <th className="px-4 py-3">Deposit Comm.</th>
                        <th className="px-4 py-3">Total Withdraw</th>
                        <th className="px-4 py-3">Withdraw Comm.</th>
                        <th className="px-4 py-3">Total Commission</th>
                        <th className="px-4 py-3">Credit To</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {settlements.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="px-4 py-10 text-center text-slate-500">
                            No settlements found
                          </td>
                        </tr>
                      ) : (
                        settlements.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-900">{row.agentName}</p>
                              <p className="text-xs text-slate-500">{row.agentMobile || '—'}</p>
                            </td>
                            <td className="px-4 py-3 text-slate-700">#{row.agentId}</td>
                            <td className="px-4 py-3 text-slate-700">{String(row.periodStart || '').slice(0, 10)}</td>
                            <td className="px-4 py-3 text-slate-700">{String(row.periodEnd || '').slice(0, 10)}</td>
                            <td className="px-4 py-3 text-slate-700">৳{formatMoney(row.totalDepositAmount)}</td>
                            <td className="px-4 py-3 text-slate-700">৳{formatMoney(row.depositCommission)}</td>
                            <td className="px-4 py-3 text-slate-700">৳{formatMoney(row.totalWithdrawAmount)}</td>
                            <td className="px-4 py-3 text-slate-700">৳{formatMoney(row.withdrawCommission)}</td>
                            <td className="px-4 py-3 font-semibold text-emerald-600">
                              ৳{formatMoney(row.totalCommission)}
                              {row.zeroReason && Number(row.totalCommission) <= 0 ? (
                                <div className="mt-1 text-[11px] font-normal text-amber-600">{row.zeroReason}</div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">{formatCreditTo(row)}</td>
                            <td className="px-4 py-3">
                              <span
                                className={[
                                  'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                  settlementStatusClass(row.status),
                                ].join(' ')}
                              >
                                {displaySettlementStatus(row.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleViewDetails(row.id)}
                                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                                >
                                  <Eye size={12} />
                                  View
                                </button>
                                {(row.status === 'pending' || row.rawStatus === 'pending') && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={actionId === row.id}
                                      onClick={() => handleApproveSettlement(row)}
                                      className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      disabled={actionId === row.id}
                                      onClick={() => handleRejectSettlement(row.id)}
                                      className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-60"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Agent</th>
                        <th className="px-4 py-3">Player</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Rate</th>
                        <th className="px-4 py-3">Commission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                            No commission transactions found
                          </td>
                        </tr>
                      ) : (
                        transactions.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3 text-slate-700">
                              {formatDateTime(row.createdAt)}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-900">{row.agentName}</td>
                            <td className="px-4 py-3 text-slate-700">{row.playerName || '—'}</td>
                            <td className="px-4 py-3">
                              <span
                                className={[
                                  'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
                                  row.type === 'deposit'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-red-100 text-red-600',
                                ].join(' ')}
                              >
                                {row.type === 'deposit' ? 'Deposit' : 'Withdraw'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700">৳{formatMoney(row.amount)}</td>
                            <td className="px-4 py-3 text-slate-700">{row.rate}%</td>
                            <td className="px-4 py-3 font-semibold text-emerald-600">
                              ৳{formatMoney(row.commissionAmount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {detailsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="text-lg font-bold text-slate-900">Settlement Details</h3>
                <button
                  type="button"
                  onClick={() => setDetailsOpen(false)}
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[calc(85vh-64px)] overflow-y-auto p-5">
                {detailsLoading ? (
                  <p className="text-sm text-slate-500">Loading...</p>
                ) : settlementDetails ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Agent</p>
                        <p className="font-semibold text-slate-900">
                          {settlementDetails.settlement.agentName}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Period</p>
                        <p className="font-semibold text-slate-900">
                          {settlementDetails.settlement.periodLabel}
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 p-3">
                        <p className="text-xs text-emerald-600">Total Commission</p>
                        <p className="font-semibold text-emerald-700">
                          ৳{formatMoney(settlementDetails.settlement.totalCommission)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Status</p>
                        <p className="font-semibold capitalize text-slate-900">
                          {settlementDetails.settlement.status}
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Player</th>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2">Amount</th>
                            <th className="px-3 py-2">Rate</th>
                            <th className="px-3 py-2">Commission</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(settlementDetails.commissions || []).map((item) => (
                            <tr key={item.id}>
                              <td className="px-3 py-2">{formatDateTime(item.createdAt)}</td>
                              <td className="px-3 py-2">{item.playerName}</td>
                              <td className="px-3 py-2 capitalize">{item.type}</td>
                              <td className="px-3 py-2">৳{formatMoney(item.amount)}</td>
                              <td className="px-3 py-2">{item.rate}%</td>
                              <td className="px-3 py-2 font-semibold text-emerald-600">
                                ৳{formatMoney(item.commissionAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
