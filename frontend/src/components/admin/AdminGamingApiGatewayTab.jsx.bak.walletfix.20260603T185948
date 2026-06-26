import { useCallback, useEffect, useState } from 'react';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
import {
  disableAdminGamingProvider,
  downloadAdminGamingTransactionsExport,
  enableAdminGamingProvider,
  fetchAdminGamingApiSettings,
  fetchAdminGamingTransactions,
  saveAdminGamingApiSettings,
  testAdminGamingApiConnection,
  testAdminGamingGameLaunch,
} from '../../services/adminGamingApiSettingsService';

const GAME_TYPES = ['SLOT', 'LIVE', 'SPORTS', 'FISH', 'CASINO'];
const PROVIDERS = ['JILI', 'PGSOFT', 'PRAGMATIC', 'EVOLUTION', 'SPRIBE', 'ORACLE', 'Custom Provider'];

const DEFAULT_FORM = {
  providerName: 'Oracle Gaming API',
  providerStatus: 'inactive',
  apiMode: 'demo',
  apiBaseUrl: 'https://api.oraclegames.live',
  apiKey: '',
  secretKey: '',
  operatorId: '',
  callbackUrl: 'https://jowabuzz.com/api/oracle/callback',
  refundUrl: 'https://jowabuzz.com/api/oracle/callback',
  webhookSecret: '',
  currency: 'BDT',
  supportedGames: ['SLOT', 'LIVE', 'SPORTS', 'FISH', 'CASINO'],
  supportedProviders: ['JILI', 'PGSOFT', 'PRAGMATIC', 'EVOLUTION', 'SPRIBE', 'ORACLE'],
};

const DEFAULT_LAUNCH = {
  username: 'test1235',
  money: 100,
  game_code: '230',
  provider_code: 'JILIS',
  game_type: 'SLOT',
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

function SecretField({ label, value, configured, onChange, placeholder }) {
  return (
    <Field label={label} hint={configured ? 'Stored securely. Leave blank to keep current value.' : undefined}>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={configured ? 'Leave blank to keep current value' : placeholder}
        autoComplete="new-password"
        className={inputClassName()}
      />
    </Field>
  );
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function statusBadge(status) {
  if (status === 'active') return 'bg-emerald-100 text-emerald-700';
  if (status === 'refunded') return 'bg-violet-100 text-violet-700';
  if (status === 'failed') return 'bg-red-100 text-red-600';
  return 'bg-amber-100 text-amber-700';
}

export default function AdminGamingApiGatewayTab({ showToast }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [configured, setConfigured] = useState({ apiKey: false, secretKey: false, webhookSecret: false });
  const [launchForm, setLaunchForm] = useState(DEFAULT_LAUNCH);
  const [launchResult, setLaunchResult] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [toggling, setToggling] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminGamingApiSettings();
      const s = result.settings || {};
      setForm({
        providerName: s.providerName ?? DEFAULT_FORM.providerName,
        providerStatus: s.providerStatus ?? 'inactive',
        apiMode: s.apiMode ?? 'demo',
        apiBaseUrl: s.apiBaseUrl ?? DEFAULT_FORM.apiBaseUrl,
        apiKey: '',
        secretKey: '',
        operatorId: s.operatorId ?? '',
        callbackUrl: s.callbackUrl ?? DEFAULT_FORM.callbackUrl,
        refundUrl: s.refundUrl ?? DEFAULT_FORM.refundUrl,
        webhookSecret: '',
        currency: s.currency ?? 'BDT',
        supportedGames: s.supportedGames ?? DEFAULT_FORM.supportedGames,
        supportedProviders: s.supportedProviders ?? DEFAULT_FORM.supportedProviders,
      });
      setConfigured({
        apiKey: Boolean(s.apiKeyConfigured),
        secretKey: Boolean(s.secretKeyConfigured),
        webhookSecret: Boolean(s.webhookSecretConfigured),
      });
    } catch (error) {
      showToast(error.message || 'Failed to load gaming gateway settings');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const result = await fetchAdminGamingTransactions({ search, startDate, endDate });
      setTransactions(result.transactions || []);
    } catch (error) {
      showToast(error.message || 'Failed to load gaming transactions');
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  }, [search, startDate, endDate, showToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const updateField = (key, value) => setForm((c) => ({ ...c, [key]: value }));

  const toggleGameType = (type) => {
    setForm((c) => ({
      ...c,
      supportedGames: c.supportedGames.includes(type)
        ? c.supportedGames.filter((item) => item !== type)
        : [...c.supportedGames, type],
    }));
  };

  const toggleProvider = (provider) => {
    setForm((c) => ({
      ...c,
      supportedProviders: c.supportedProviders.includes(provider)
        ? c.supportedProviders.filter((item) => item !== provider)
        : [...c.supportedProviders, provider],
    }));
  };

  const buildPayload = () => ({
    providerName: form.providerName.trim(),
    providerStatus: form.providerStatus,
    apiMode: form.apiMode,
    apiBaseUrl: form.apiBaseUrl.trim(),
    operatorId: form.operatorId.trim(),
    currency: form.currency.trim(),
    supportedGames: form.supportedGames,
    supportedProviders: form.supportedProviders,
    ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
    ...(form.secretKey.trim() ? { secretKey: form.secretKey.trim() } : {}),
    ...(form.webhookSecret.trim() ? { webhookSecret: form.webhookSecret.trim() } : {}),
  });

  const maybeSaveBeforeTest = async () => {
    if (form.apiKey.trim() || form.secretKey.trim() || form.webhookSecret.trim()) {
      await saveAdminGamingApiSettings(buildPayload());
      await loadSettings();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAdminGamingApiSettings(buildPayload());
      showToast('Configuration saved successfully', 'success');
      await loadSettings();
    } catch (error) {
      showToast(error.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      await maybeSaveBeforeTest();
      const result = await testAdminGamingApiConnection();
      showToast(result.message || 'Connection test completed', result.success ? 'success' : 'error');
    } catch (error) {
      showToast(error.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleTestLaunch = async () => {
    setLaunching(true);
    setLaunchResult(null);
    try {
      await maybeSaveBeforeTest();
      const result = await testAdminGamingGameLaunch(launchForm);
      setLaunchResult(result.result || null);
      showToast(result.message || 'Game launch test completed', result.success ? 'success' : 'error');
    } catch (error) {
      showToast(error.message || 'Game launch test failed');
    } finally {
      setLaunching(false);
    }
  };

  const handleEnable = async () => {
    setToggling(true);
    try {
      await saveAdminGamingApiSettings({ ...buildPayload(), providerStatus: 'active' });
      await enableAdminGamingProvider();
      showToast('Provider enabled', 'success');
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
      await disableAdminGamingProvider();
      showToast('Provider disabled', 'success');
      await loadSettings();
    } catch (error) {
      showToast(error.message || 'Failed to disable provider');
    } finally {
      setToggling(false);
    }
  };

  const handleExport = async (format) => {
    try {
      await downloadAdminGamingTransactionsExport(format, { search, startDate, endDate });
      showToast(`${format.toUpperCase()} exported`, 'success');
    } catch (error) {
      showToast(error.message || 'Export failed');
    }
  };

  const busy = loading || saving || testing || launching || toggling;

  return (
    <div className="admin-general-setting-page space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Gaming API Gateway</h3>
            <p className="mt-1 text-xs text-slate-500">Oracle Gaming API integration (GGR Panel)</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(form.providerStatus === 'active' ? 'active' : 'pending')}`}
          >
            {form.providerStatus === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="space-y-4 p-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin text-emerald-500" />
              Loading gateway settings...
            </div>
          ) : (
            <>
              <SectionCard title="Provider Information">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Provider Name">
                    <input
                      type="text"
                      value={form.providerName}
                      onChange={(e) => updateField('providerName', e.target.value)}
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="Provider Status">
                    <select
                      value={form.providerStatus}
                      onChange={(e) => updateField('providerStatus', e.target.value)}
                      className={inputClassName()}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
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
                  <Field label="Currency">
                    <input
                      type="text"
                      value={form.currency}
                      onChange={(e) => updateField('currency', e.target.value)}
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="API Base URL" hint="POST endpoint. Header: x-dstgame-key">
                    <input
                      type="url"
                      value={form.apiBaseUrl}
                      onChange={(e) => updateField('apiBaseUrl', e.target.value)}
                      className={`${inputClassName()} md:col-span-2`}
                    />
                  </Field>
                  <SecretField
                    label="API Key"
                    value={form.apiKey}
                    configured={configured.apiKey}
                    onChange={(v) => updateField('apiKey', v)}
                    placeholder="Enter API key"
                  />
                  <SecretField
                    label="Secret Key"
                    value={form.secretKey}
                    configured={configured.secretKey}
                    onChange={(v) => updateField('secretKey', v)}
                    placeholder="Enter secret key"
                  />
                  <Field label="Operator ID">
                    <input
                      type="text"
                      value={form.operatorId}
                      onChange={(e) => updateField('operatorId', e.target.value)}
                      className={inputClassName()}
                    />
                  </Field>
                  <SecretField
                    label="Webhook Secret (verification_key)"
                    value={form.webhookSecret}
                    configured={configured.webhookSecret}
                    onChange={(v) => updateField('webhookSecret', v)}
                    placeholder="Enter webhook secret"
                  />
                  <Field label="Callback URL" hint="Fixed URL — cannot be changed">
                    <input type="text" value={form.callbackUrl} readOnly className={`${inputClassName()} bg-slate-50`} />
                  </Field>
                  <Field label="Refund URL" hint="Fixed URL — cannot be changed">
                    <input type="text" value={form.refundUrl} readOnly className={`${inputClassName()} bg-slate-50`} />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard title="Supported Game Types">
                <div className="flex flex-wrap gap-3">
                  {GAME_TYPES.map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.supportedGames.includes(type)}
                        onChange={() => toggleGameType(type)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Supported Providers">
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {PROVIDERS.map((provider) => (
                    <label
                      key={provider}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.supportedProviders.includes(provider)}
                        onChange={() => toggleProvider(provider)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                      />
                      {provider}
                    </label>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Test Game Launch">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <Field label="Username">
                    <input
                      type="text"
                      value={launchForm.username}
                      onChange={(e) => setLaunchForm((c) => ({ ...c, username: e.target.value }))}
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="Money">
                    <input
                      type="number"
                      value={launchForm.money}
                      onChange={(e) => setLaunchForm((c) => ({ ...c, money: e.target.value }))}
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="Game Code">
                    <input
                      type="text"
                      value={launchForm.game_code}
                      onChange={(e) => setLaunchForm((c) => ({ ...c, game_code: e.target.value }))}
                      className={inputClassName()}
                    />
                  </Field>
                  <Field label="Provider Code">
                    <select
                      value={launchForm.provider_code}
                      onChange={(e) => setLaunchForm((c) => ({ ...c, provider_code: e.target.value }))}
                      className={inputClassName()}
                    >
                      {form.supportedProviders.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Game Type">
                    <select
                      value={launchForm.game_type}
                      onChange={(e) => setLaunchForm((c) => ({ ...c, game_type: e.target.value }))}
                      className={inputClassName()}
                    >
                      {form.supportedGames.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                {launchResult?.gameUrl ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-medium text-emerald-800">Returned game_url</p>
                    <a
                      href={launchResult.gameUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 break-all text-sm text-emerald-700 underline"
                    >
                      {launchResult.gameUrl}
                      <ExternalLink size={14} />
                    </a>
                  </div>
                ) : null}
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
                  onClick={handleTestConnection}
                  disabled={busy}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {testing ? 'Testing...' : 'Test API Connection'}
                </button>
                <button
                  type="button"
                  onClick={handleTestLaunch}
                  disabled={busy}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {launching ? 'Launching...' : 'Test Game Launch'}
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Gaming Transactions</h3>
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
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username, tx id, provider..."
              className={inputClassName()}
            />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClassName()} />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClassName()} />
          </div>
        </div>

        <div className="overflow-x-auto">
          {txLoading ? (
            <div className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin text-emerald-500" />
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500">No gaming transactions yet.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Username</th>
                  <th className="px-5 py-3">Provider</th>
                  <th className="px-5 py-3">Game</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Transaction ID</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 text-slate-600">{formatDateTime(row.createdAt)}</td>
                    <td className="px-5 py-3">{row.username}</td>
                    <td className="px-5 py-3">{row.providerCode || '—'}</td>
                    <td className="px-5 py-3">{row.gameCode || '—'}</td>
                    <td className="px-5 py-3">{row.betType}</td>
                    <td className="px-5 py-3 font-semibold text-emerald-700">৳{formatMoney(row.amount)}</td>
                    <td className="px-5 py-3 font-mono text-xs">{row.transactionId}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(row.status)}`}>
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
