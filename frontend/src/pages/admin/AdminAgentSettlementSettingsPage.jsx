import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminToast from '../../components/admin/AdminToast';
import {
  fetchAdminAgentCommissionSettings,
  saveAdminAgentCommissionSettings,
} from '../../services/adminAgentCommissionService';

const MONTH_DAYS = Array.from({ length: 31 }, (_, index) => ({
  value: index + 1,
  label: String(index + 1),
}));

function getPreview(settings) {
  if (!settings) return null;
  const day = Number(settings.settlementDay || 3);
  return {
    typeLabel: 'Monthly',
    period: `Previous month day ${day} 00:00 → Current month day ${day} 23:59`,
    pendingTime: `Day after ${day} at 12:05 AM`,
    detail: `Settlement Day ${day} → Period ends on the ${day}${day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}, pending created next day 12:05 AM`,
  };
}

export default function AdminAgentSettlementSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [depositPercent, setDepositPercent] = useState(5);
  const [withdrawPercent, setWithdrawPercent] = useState(2);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      const result = await fetchAdminAgentCommissionSettings();
      const data = result.settings || null;
      setSettings(data);
      setDepositPercent(Number(data?.depositPercent ?? 5));
      setWithdrawPercent(Number(data?.withdrawPercent ?? 2));
    } catch (error) {
      showToast(error.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAdminAgentCommissionSettings({
        depositPercent,
        withdrawPercent,
        settlementType: 'monthly',
        settlementDay: Number(settings?.settlementDay ?? 3),
        autoSettlement: Boolean(settings?.autoSettlement),
      });
      showToast('Agent commission settings saved', 'success');
      await load();
    } catch (error) {
      showToast(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const preview = getPreview(settings);

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Agent Commission Settings</h2>
          <p className="mt-1 text-sm text-slate-500">
            Monthly settlement only. Commission = player deposit × deposit % + player withdraw × withdraw %.
            {' '}
            <Link to="/admin/agent-commission" className="font-semibold text-emerald-600 underline">
              Back to Agent Commission
            </Link>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Deposit Commission %</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                disabled={loading || saving}
                value={depositPercent}
                onChange={(e) => setDepositPercent(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Withdraw Commission %</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                disabled={loading || saving}
                value={withdrawPercent}
                onChange={(e) => setWithdrawPercent(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Monthly Settlement Day (1–31)</span>
            <select
              disabled={loading || saving}
              value={settings?.settlementDay ?? 3}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, settlementDay: Number(event.target.value) }))
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {MONTH_DAYS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              disabled={loading || saving}
              checked={Boolean(settings?.autoSettlement)}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, autoSettlement: event.target.checked }))
              }
            />
            <span className="text-sm text-slate-700">Active — auto create Pending settlement at 12:05 AM after period ends</span>
          </label>

          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Settlement Type: <strong>Monthly</strong> (fixed)
          </div>

          {preview ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <div className="font-semibold">Current Rule Preview</div>
              <div className="mt-1">Type: <strong>{preview.typeLabel}</strong></div>
              <div>Period: <strong>{preview.period}</strong></div>
              <div>Auto Pending: <strong>{preview.pendingTime}</strong></div>
              <div className="mt-1 text-xs text-emerald-700">{preview.detail}</div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </>
  );
}
