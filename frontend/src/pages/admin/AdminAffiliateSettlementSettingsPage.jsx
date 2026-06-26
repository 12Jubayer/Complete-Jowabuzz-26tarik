import { useCallback, useEffect, useState } from 'react';
import AdminToast from '../../components/admin/AdminToast';
import {
  fetchCommissionSettings,
  updateSettlementSettings,
} from '../../services/adminAffiliateService';

const SETTLEMENT_TYPE_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

const SETTLEMENT_DAY_OPTIONS = [
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getPreview(settings) {
  if (!settings) return null;

  if (settings.settlementType === 'daily') {
    return {
      typeLabel: 'Daily',
      period: 'Previous day (yesterday)',
      pendingTime: 'Every day 12:05 AM',
      detail: 'Example: Monday commission → Pending Tuesday 12:05 AM',
    };
  }

  const day = Number(settings.settlementDay);
  const startIndex = (day + 1) % 7;
  const nextDay = WEEKDAYS[(day + 1) % 7];

  return {
    typeLabel: 'Weekly',
    period: `${WEEKDAYS[startIndex]} → ${WEEKDAYS[day]}`,
    pendingTime: `${nextDay} 12:05 AM`,
    detail: `Example: ${WEEKDAYS[day]} selected → week ${WEEKDAYS[startIndex]} to ${WEEKDAYS[day]}, pending ${nextDay} 12:05 AM`,
  };
}

export default function AdminAffiliateSettlementSettingsPage() {
  const [settings, setSettings] = useState(null);
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
      setSettings(await fetchCommissionSettings());
    } catch (error) {
      showToast(error.message || 'Failed to load settlement settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      await updateSettlementSettings(payload);
      showToast('Settlement settings saved', 'success');
      await load();
    } catch (error) {
      showToast(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const preview = getPreview(settings);
  const isWeekly = settings?.settlementType === 'weekly';

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Affiliate Settlement Settings</h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose Daily or Weekly settlement. Auto pending is created every day at 12:05 AM server time when active.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Settlement Type</span>
            <select
              disabled={loading || saving}
              value={settings?.settlementType || 'weekly'}
              onChange={(event) =>
                handleSave({
                  settlementType: event.target.value,
                  settlementDay: settings?.settlementDay ?? 6,
                  autoSettlement: settings?.autoSettlement,
                })
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {SETTLEMENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {isWeekly ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Settlement Day</span>
              <p className="mb-2 text-sm text-slate-500">
                Week ends on this day. Pending is created the next day at 12:05 AM.
              </p>
              <select
                disabled={loading || saving}
                value={settings?.settlementDay ?? 6}
                onChange={(event) =>
                  handleSave({
                    settlementType: settings?.settlementType || 'weekly',
                    settlementDay: Number(event.target.value),
                    autoSettlement: settings?.autoSettlement,
                  })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {SETTLEMENT_DAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Daily settlement uses the previous calendar day. No settlement day selection needed.
            </div>
          )}

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              disabled={loading || saving}
              checked={Boolean(settings?.autoSettlement)}
              onChange={(event) =>
                handleSave({
                  settlementType: settings?.settlementType || 'weekly',
                  settlementDay: settings?.settlementDay ?? 6,
                  autoSettlement: event.target.checked,
                })
              }
            />
            <span className="text-sm text-slate-700">Active — auto create Pending settlement at 12:05 AM</span>
          </label>

          {preview ? (
            <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-900">
              <div className="font-semibold">Current Rule Preview</div>
              <div className="mt-1">Type: <strong>{preview.typeLabel}</strong></div>
              <div>Period: <strong>{preview.period}</strong></div>
              <div>Auto Pending: <strong>{preview.pendingTime}</strong> (server time)</div>
              <div className="mt-1 text-xs text-violet-700">{preview.detail}</div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
