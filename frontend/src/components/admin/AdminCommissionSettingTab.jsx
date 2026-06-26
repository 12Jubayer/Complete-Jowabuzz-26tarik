import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  approveAdminCommissionRecord,
  downloadAdminCommissionExport,
  fetchAdminCommissionRecords,
  fetchAdminCommissionSettings,
  rejectAdminCommissionRecord,
  resetAdminCommissionSettings,
  saveAdminCommissionSettings,
} from '../../services/adminCommissionSettingsService';

const DEFAULT_FORM = {
  agentDepositPercent: 5,
  agentWithdrawPercent: 2,
  settlementDay: 3,
  autoSettlement: false,
  manualApproval: true,
  affiliateDepositPercent: 25,
  affiliateWithdrawPercent: 0,
  affiliateWeeklySettlement: true,
  affiliateManualApproval: true,
  superAffiliateDepositPercent: 10,
  superAffiliateWithdrawPercent: 0,
  superAffiliateSettlementDay: 3,
};

const LIST_TABS = [
  { id: 'pending', label: 'Pending Commission List' },
  { id: 'approved', label: 'Approved Commission List' },
  { id: 'rejected', label: 'Rejected Commission List' },
];

const ROLE_OPTIONS = [
  { value: 'all', label: 'All roles' },
  { value: 'agent', label: 'Agent' },
  { value: 'affiliate', label: 'Affiliate' },
  { value: 'super_affiliate', label: 'Super Affiliate' },
];

function inputClassName() {
  return 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500';
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-base font-semibold text-slate-900">{title}</h4>
      {children}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600"
      />
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      </div>
    </label>
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

function roleLabel(role) {
  if (role === 'super_affiliate') return 'Super Affiliate';
  if (role === 'affiliate') return 'Affiliate';
  return 'Agent';
}

function statusClass(status) {
  if (status === 'approved') return 'bg-emerald-100 text-emerald-700';
  if (status === 'rejected') return 'bg-red-100 text-red-600';
  return 'bg-amber-100 text-amber-700';
}

export default function AdminCommissionSettingTab({ showToast }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [listTab, setListTab] = useState('pending');
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actionId, setActionId] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminCommissionSettings();
      const settings = result.settings || {};
      setForm({
        agentDepositPercent: settings.agentDepositPercent ?? DEFAULT_FORM.agentDepositPercent,
        agentWithdrawPercent: settings.agentWithdrawPercent ?? DEFAULT_FORM.agentWithdrawPercent,
        settlementDay: settings.settlementDay ?? DEFAULT_FORM.settlementDay,
        autoSettlement: settings.autoSettlement ?? DEFAULT_FORM.autoSettlement,
        manualApproval: settings.manualApproval ?? DEFAULT_FORM.manualApproval,
        affiliateDepositPercent: settings.affiliateDepositPercent ?? DEFAULT_FORM.affiliateDepositPercent,
        affiliateWithdrawPercent: settings.affiliateWithdrawPercent ?? DEFAULT_FORM.affiliateWithdrawPercent,
        affiliateWeeklySettlement: settings.affiliateWeeklySettlement ?? DEFAULT_FORM.affiliateWeeklySettlement,
        affiliateManualApproval: settings.affiliateManualApproval ?? DEFAULT_FORM.affiliateManualApproval,
        superAffiliateDepositPercent:
          settings.superAffiliateDepositPercent ?? DEFAULT_FORM.superAffiliateDepositPercent,
        superAffiliateWithdrawPercent:
          settings.superAffiliateWithdrawPercent ?? DEFAULT_FORM.superAffiliateWithdrawPercent,
        superAffiliateSettlementDay:
          settings.superAffiliateSettlementDay ?? DEFAULT_FORM.superAffiliateSettlementDay,
      });
    } catch (error) {
      showToast(error.message || 'Failed to load commission settings');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const result = await fetchAdminCommissionRecords({
        status: listTab,
        role: roleFilter,
        search,
        startDate,
        endDate,
      });
      setRecords(result.records || []);
    } catch (error) {
      showToast(error.message || 'Failed to load commission records');
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  }, [listTab, roleFilter, search, startDate, endDate, showToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const buildPayload = () => ({
    agentDepositPercent: Number(form.agentDepositPercent),
    agentWithdrawPercent: Number(form.agentWithdrawPercent),
    affiliateDepositPercent: Number(form.affiliateDepositPercent),
    affiliateWithdrawPercent: Number(form.affiliateWithdrawPercent),
    superAffiliateDepositPercent: Number(form.superAffiliateDepositPercent),
    superAffiliateWithdrawPercent: Number(form.superAffiliateWithdrawPercent),
    settlementDay: Number(form.settlementDay),
    superAffiliateSettlementDay: Number(form.superAffiliateSettlementDay),
    autoSettlement: Boolean(form.autoSettlement),
    manualApproval: Boolean(form.manualApproval),
    affiliateWeeklySettlement: Boolean(form.affiliateWeeklySettlement),
    affiliateManualApproval: Boolean(form.affiliateManualApproval),
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAdminCommissionSettings(buildPayload());
      showToast('Commission settings saved successfully', 'success');
      await loadSettings();
      await loadRecords();
    } catch (error) {
      showToast(error.message || 'Failed to save commission settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetAdminCommissionSettings();
      showToast('Commission settings reset to defaults', 'success');
      await loadSettings();
      await loadRecords();
    } catch (error) {
      showToast(error.message || 'Failed to reset commission settings');
    } finally {
      setResetting(false);
    }
  };

  const handleApprove = async (record) => {
    const key = `${record.source}-${record.id}`;
    setActionId(key);
    try {
      await approveAdminCommissionRecord(record.source, record.id);
      showToast('Commission approved', 'success');
      await loadRecords();
    } catch (error) {
      showToast(error.message || 'Failed to approve commission');
    } finally {
      setActionId('');
    }
  };

  const handleReject = async (record) => {
    const key = `${record.source}-${record.id}`;
    setActionId(key);
    try {
      await rejectAdminCommissionRecord(record.source, record.id);
      showToast('Commission rejected', 'success');
      await loadRecords();
    } catch (error) {
      showToast(error.message || 'Failed to reject commission');
    } finally {
      setActionId('');
    }
  };

  const handleExport = async (format) => {
    try {
      await downloadAdminCommissionExport(format, {
        status: listTab,
        role: roleFilter,
        search,
        startDate,
        endDate,
      });
      showToast(`${format.toUpperCase()} export downloaded`, 'success');
    } catch (error) {
      showToast(error.message || 'Export failed');
    }
  };

  const currentListTab = useMemo(
    () => LIST_TABS.find((tab) => tab.id === listTab) || LIST_TABS[0],
    [listTab],
  );

  return (
    <div className="admin-general-setting-page space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Commission Setting (%)</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={loading || saving || resetting}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {resetting ? 'Resetting...' : 'Reset'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving || resetting}
              className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {loading ? (
            <p className="text-sm text-slate-500">Loading commission settings...</p>
          ) : (
            <>
              <SectionCard title="Section 1: Agent Commission">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Deposit Commission (%)">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.agentDepositPercent}
                      onChange={(e) => updateField('agentDepositPercent', e.target.value)}
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="Withdraw Commission (%)">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.agentWithdrawPercent}
                      onChange={(e) => updateField('agentWithdrawPercent', e.target.value)}
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="Monthly Settlement Day">
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={form.settlementDay}
                      onChange={(e) => updateField('settlementDay', e.target.value)}
                      className={inputClassName()}
                    />
                  </Field>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <ToggleRow
                    label="Auto Settlement"
                    description="Automatically batch pending agent commissions on settlement day."
                    checked={form.autoSettlement}
                    onChange={(value) => updateField('autoSettlement', value)}
                  />
                  <ToggleRow
                    label="Manual Approval"
                    description="Require admin approval before commission credits agent wallet."
                    checked={form.manualApproval}
                    onChange={(value) => updateField('manualApproval', value)}
                  />
                </div>
              </SectionCard>

              <SectionCard title="Section 2: Affiliate Commission">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Deposit Commission (%)">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.affiliateDepositPercent}
                      onChange={(e) => updateField('affiliateDepositPercent', e.target.value)}
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="Withdraw Commission (%)">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.affiliateWithdrawPercent}
                      onChange={(e) => updateField('affiliateWithdrawPercent', e.target.value)}
                      className={inputClassName()}
                    />
                  </Field>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <ToggleRow
                    label="Weekly Settlement"
                    description="Run affiliate commission settlement weekly."
                    checked={form.affiliateWeeklySettlement}
                    onChange={(value) => updateField('affiliateWeeklySettlement', value)}
                  />
                  <ToggleRow
                    label="Manual Approval"
                    description="Require admin approval before affiliate commission is released."
                    checked={form.affiliateManualApproval}
                    onChange={(value) => updateField('affiliateManualApproval', value)}
                  />
                </div>
              </SectionCard>

              <SectionCard title="Section 3: Super Affiliate Commission">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Deposit Commission (%)">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.superAffiliateDepositPercent}
                      onChange={(e) => updateField('superAffiliateDepositPercent', e.target.value)}
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="Withdraw Commission (%)">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.superAffiliateWithdrawPercent}
                      onChange={(e) => updateField('superAffiliateWithdrawPercent', e.target.value)}
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="Settlement Day">
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={form.superAffiliateSettlementDay}
                      onChange={(e) => updateField('superAffiliateSettlementDay', e.target.value)}
                      className={inputClassName()}
                    />
                  </Field>
                </div>
              </SectionCard>
            </>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">{currentListTab.label}</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleExport('csv')}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download size={16} />
                CSV
              </button>
              <button
                type="button"
                onClick={() => handleExport('pdf')}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download size={16} />
                PDF
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {LIST_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setListTab(tab.id)}
                className={[
                  'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  tab.id === listTab
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search beneficiary or player..."
              className={inputClassName()}
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={inputClassName()}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClassName()}
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClassName()}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {recordsLoading ? (
            <p className="px-5 py-8 text-sm text-slate-500">Loading commission records...</p>
          ) : records.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">No commission records found.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Beneficiary</th>
                  <th className="px-5 py-3">Player</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Base</th>
                  <th className="px-5 py-3">Rate</th>
                  <th className="px-5 py-3">Commission</th>
                  <th className="px-5 py-3">Status</th>
                  {listTab === 'pending' ? <th className="px-5 py-3">Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const actionKey = `${record.source}-${record.id}`;
                  return (
                    <tr key={actionKey} className="border-t border-slate-100">
                      <td className="px-5 py-3 text-slate-600">{formatDateTime(record.createdAt)}</td>
                      <td className="px-5 py-3">{roleLabel(record.roleType)}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900">{record.beneficiaryName || '—'}</div>
                        <div className="text-xs text-slate-500">{record.beneficiaryMobile || ''}</div>
                      </td>
                      <td className="px-5 py-3">{record.playerName || '—'}</td>
                      <td className="px-5 py-3 capitalize">{record.commissionType}</td>
                      <td className="px-5 py-3">৳{formatMoney(record.baseAmount)}</td>
                      <td className="px-5 py-3">{record.rate}%</td>
                      <td className="px-5 py-3 font-semibold text-emerald-700">
                        ৳{formatMoney(record.commissionAmount)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(record.status)}`}
                        >
                          {record.status}
                        </span>
                      </td>
                      {listTab === 'pending' ? (
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={actionId === actionKey}
                              onClick={() => handleApprove(record)}
                              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={actionId === actionKey}
                              onClick={() => handleReject(record)}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
