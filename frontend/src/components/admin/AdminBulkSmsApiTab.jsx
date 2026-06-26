import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  disableAdminSmsProvider,
  enableAdminSmsProvider,
  fetchAdminSmsLogs,
  fetchAdminSmsSettings,
  saveAdminSmsSettings,
  sendAdminBulkSms,
  testAdminSms,
} from '../../services/adminSmsSettingsService';

const DEFAULT_FORM = {
  providerName: 'Bulk SMS API',
  apiMode: 'demo',
  apiBaseUrl: '',
  apiToken: '',
  senderId: '',
  defaultCountryCode: '+880',
  otpTemplate: 'Your JowaBuzz OTP is {otp}. Valid for {minutes} minutes.',
  promotionalTemplate: '{message}',
  isActive: false,
};

function inputClassName() {
  return 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500';
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
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

function statusBadge(active) {
  return active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
}

function logStatusBadge(status) {
  if (status === 'sent' || status === 'demo') return 'bg-emerald-100 text-emerald-700';
  if (status === 'failed') return 'bg-red-100 text-red-600';
  return 'bg-slate-100 text-slate-600';
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function AdminBulkSmsApiTab({ showToast }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [testMobile, setTestMobile] = useState('');
  const [bulkMobiles, setBulkMobiles] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');
  const [logs, setLogs] = useState([]);
  const [logSearch, setLogSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminSmsSettings();
      const s = result.settings || {};
      setForm({
        providerName: s.providerName ?? DEFAULT_FORM.providerName,
        apiMode: s.apiMode ?? 'demo',
        apiBaseUrl: s.apiBaseUrl ?? '',
        apiToken: '',
        senderId: s.senderId ?? '',
        defaultCountryCode: s.defaultCountryCode ?? '+880',
        otpTemplate: s.otpTemplate ?? DEFAULT_FORM.otpTemplate,
        promotionalTemplate: s.promotionalTemplate ?? DEFAULT_FORM.promotionalTemplate,
        isActive: Boolean(s.isActive),
      });
      setTokenConfigured(Boolean(s.apiTokenConfigured));
    } catch (error) {
      showToast(error.message || 'Failed to load SMS settings');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const result = await fetchAdminSmsLogs(logSearch);
      setLogs(result.logs || []);
    } catch (error) {
      showToast(error.message || 'Failed to load SMS logs');
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [logSearch, showToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const buildPayload = () => ({
    providerName: form.providerName.trim(),
    apiMode: form.apiMode,
    apiBaseUrl: form.apiBaseUrl.trim(),
    senderId: form.senderId.trim(),
    defaultCountryCode: form.defaultCountryCode.trim(),
    otpTemplate: form.otpTemplate.trim(),
    promotionalTemplate: form.promotionalTemplate.trim(),
    isActive: form.isActive,
    ...(form.apiToken.trim() ? { apiToken: form.apiToken.trim() } : {}),
  });

  const maybeSaveBeforeAction = async () => {
    if (form.apiToken.trim()) {
      await saveAdminSmsSettings(buildPayload());
      await loadSettings();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAdminSmsSettings(buildPayload());
      showToast('SMS configuration saved successfully', 'success');
      await loadSettings();
    } catch (error) {
      showToast(error.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSms = async () => {
    if (!testMobile.trim()) {
      showToast('Enter a test mobile number');
      return;
    }

    setTesting(true);
    try {
      await maybeSaveBeforeAction();
      const result = await testAdminSms({ mobile: testMobile.trim() });
      showToast(result.message || 'Test SMS completed', 'success');
      await loadLogs();
    } catch (error) {
      showToast(error.message || 'Test SMS failed');
    } finally {
      setTesting(false);
    }
  };

  const handleEnable = async () => {
    setToggling(true);
    try {
      await saveAdminSmsSettings({ ...buildPayload(), isActive: true });
      await enableAdminSmsProvider();
      showToast('SMS provider enabled', 'success');
      await loadSettings();
    } catch (error) {
      showToast(error.message || 'Failed to enable provider');
    } finally {
      setToggling(false);
    }
  };

  const handleDisable = async () => {
    setToggling(true);
    try {
      await disableAdminSmsProvider();
      showToast('SMS provider disabled', 'success');
      await loadSettings();
    } catch (error) {
      showToast(error.message || 'Failed to disable provider');
    } finally {
      setToggling(false);
    }
  };

  const handleBulkSend = async () => {
    const mobiles = bulkMobiles
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!mobiles.length) {
      showToast('Enter at least one mobile number');
      return;
    }

    if (!bulkMessage.trim()) {
      showToast('Enter promotional message');
      return;
    }

    setBulkSending(true);
    try {
      const result = await sendAdminBulkSms({ mobiles, message: bulkMessage.trim() });
      showToast(result.message || 'Bulk SMS sent', 'success');
      await loadLogs();
    } catch (error) {
      showToast(error.message || 'Bulk SMS failed');
    } finally {
      setBulkSending(false);
    }
  };

  const busy = loading || saving || testing || toggling || bulkSending;

  return (
    <div className="admin-general-setting-page space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Bulk SMS API</h3>
            <p className="mt-1 text-xs text-slate-500">OTP, transactional and promotional SMS gateway</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(form.isActive)}`}>
            {form.isActive ? 'ON' : 'OFF'}
          </span>
        </div>

        <div className="space-y-4 p-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin text-emerald-500" />
              Loading SMS settings...
            </div>
          ) : (
            <>
              <SectionCard title="Provider Configuration">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="SMS Provider Name">
                    <input
                      type="text"
                      value={form.providerName}
                      onChange={(e) => updateField('providerName', e.target.value)}
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="Status">
                    <select
                      value={form.isActive ? 'on' : 'off'}
                      onChange={(e) => updateField('isActive', e.target.value === 'on')}
                      className={inputClassName()}
                    >
                      <option value="on">ON</option>
                      <option value="off">OFF</option>
                    </select>
                  </Field>
                  <Field label="API Mode">
                    <select
                      value={form.apiMode}
                      onChange={(e) => updateField('apiMode', e.target.value)}
                      className={inputClassName()}
                    >
                      <option value="demo">Demo</option>
                      <option value="production">Production</option>
                    </select>
                  </Field>
                  <Field label="Default Country Code">
                    <input
                      type="text"
                      value={form.defaultCountryCode}
                      onChange={(e) => updateField('defaultCountryCode', e.target.value)}
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="API Base URL" hint="POST endpoint for SMS provider">
                    <input
                      type="url"
                      value={form.apiBaseUrl}
                      onChange={(e) => updateField('apiBaseUrl', e.target.value)}
                      placeholder="https://sms-provider.com/api/send"
                      className={`${inputClassName()} md:col-span-2`}
                    />
                  </Field>
                  <Field
                    label="API Token"
                    hint={tokenConfigured ? 'Stored encrypted. Leave blank to keep current token.' : undefined}
                  >
                    <input
                      type="password"
                      value={form.apiToken}
                      onChange={(e) => updateField('apiToken', e.target.value)}
                      placeholder={tokenConfigured ? 'Leave blank to keep current token' : 'Enter API token'}
                      autoComplete="new-password"
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="Sender ID">
                    <input
                      type="text"
                      value={form.senderId}
                      onChange={(e) => updateField('senderId', e.target.value)}
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="OTP SMS Template" hint="Placeholders: {otp}, {purpose}, {amount}, {minutes}">
                    <textarea
                      value={form.otpTemplate}
                      onChange={(e) => updateField('otpTemplate', e.target.value)}
                      rows={3}
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="Promotional SMS Template" hint="Placeholder: {message}">
                    <textarea
                      value={form.promotionalTemplate}
                      onChange={(e) => updateField('promotionalTemplate', e.target.value)}
                      rows={3}
                      className={inputClassName()}
                    />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard title="Test SMS">
                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                  <Field label="Test Mobile Number">
                    <input
                      type="text"
                      value={testMobile}
                      onChange={(e) => setTestMobile(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className={inputClassName()}
                    />
                  </Field>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleTestSms}
                      disabled={busy}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {testing ? 'Sending...' : 'Test SMS'}
                    </button>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Promotional Bulk SMS">
                <div className="grid gap-4">
                  <Field label="Mobile Numbers" hint="Comma, semicolon or newline separated">
                    <textarea
                      value={bulkMobiles}
                      onChange={(e) => setBulkMobiles(e.target.value)}
                      rows={3}
                      placeholder="017XXXXXXXX, 018XXXXXXXX"
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="Message">
                    <textarea
                      value={bulkMessage}
                      onChange={(e) => setBulkMessage(e.target.value)}
                      rows={3}
                      className={inputClassName()}
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={handleBulkSend}
                    disabled={busy}
                    className="w-fit rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-60"
                  >
                    {bulkSending ? 'Sending...' : 'Send Promotional Bulk SMS'}
                  </button>
                </div>
              </SectionCard>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={busy}
                  className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
                <button
                  type="button"
                  onClick={handleEnable}
                  disabled={busy}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                >
                  Enable Provider
                </button>
                <button
                  type="button"
                  onClick={handleDisable}
                  disabled={busy}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                >
                  Disable Provider
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">SMS Request / Response Logs</h3>
          <input
            type="text"
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            placeholder="Search recipient, purpose, status..."
            className={`${inputClassName()} mt-4`}
          />
        </div>
        <div className="overflow-x-auto">
          {logsLoading ? (
            <div className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin text-emerald-500" />
              Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">No SMS logs yet.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Recipient</th>
                  <th className="px-5 py-3">Purpose</th>
                  <th className="px-5 py-3">Message</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 text-slate-600">{formatDateTime(row.createdAt)}</td>
                    <td className="px-5 py-3">{row.recipient}</td>
                    <td className="px-5 py-3">{row.purpose || '—'}</td>
                    <td className="max-w-xs truncate px-5 py-3">{row.message}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${logStatusBadge(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
