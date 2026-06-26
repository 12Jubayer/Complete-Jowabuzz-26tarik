import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminToast from '../../components/admin/AdminToast';
import AdminChatSettingsPanel from '../../components/admin/AdminChatSettingsPanel';
import AdminCommissionSettingTab from '../../components/admin/AdminCommissionSettingTab';
import AdminGamingApiGatewayTab from '../../components/admin/AdminGamingApiGatewayTab';
import AdminBulkSmsApiTab from '../../components/admin/AdminBulkSmsApiTab';
import {
  fetchAdminGeneralSettings,
  updateAdminGeneralSettingsSection,
} from '../../services/adminGeneralSettingsService';

const TABS = [
  { id: 'site', label: 'Site Setting', cardTitle: 'Site Setting (name, currency)' },
  { id: 'commission', label: 'Commission Setting', cardTitle: 'Commission Setting (%)' },
  { id: 'chat', label: 'Chat Setting', cardTitle: 'Chat Setting' },
  { id: 'deposit-withdraw', label: 'Deposit & Withdraw rules', cardTitle: 'Deposit & Withdraw rules (min/max)' },
  { id: 'paymentGateway', label: 'Payment Gateway config', cardTitle: 'Payment Gateway config' },
  { id: 'gaming-api-gateway', label: 'Gaming API Gateway', cardTitle: 'Gaming API Gateway' },
  { id: 'bulk-sms-api', label: 'Bulk SMS API', cardTitle: 'Bulk SMS API' },
];

const EMPTY_FORMS = {
  site: { siteName: '', currency: '', logoUrl: '', faviconUrl: '' },
  chat: { enabled: true },
  'deposit-withdraw': {
    depositMin: '',
    depositMax: '',
    withdrawMin: '',
    withdrawMax: '',
    requireTurnoverForWithdraw: true,
    requireBonusTurnoverForWithdraw: true,
  },
  paymentGateway: { provider: 'manual', apiKey: '' },
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function inputClassName() {
  return 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500';
}

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

export default function AdminGeneralSettingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'site';
  const activeTab = rawTab;
  const [forms, setForms] = useState(EMPTY_FORMS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');

  const currentTab = useMemo(
    () => TABS.find((tab) => tab.id === activeTab) || TABS[0],
    [activeTab],
  );

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminGeneralSettings();
      const settings = result.settings || {};
      setForms({
        site: {
          siteName: settings.site?.siteName ?? '',
          currency: settings.site?.currency ?? '',
          logoUrl: settings.site?.logoUrl ?? '',
          faviconUrl: settings.site?.faviconUrl ?? '',
        },
        chat: {
          enabled: settings.chat?.enabled !== false,
        },
        'deposit-withdraw': {
          depositMin: String(settings.depositWithdraw?.depositMin ?? ''),
          depositMax: String(settings.depositWithdraw?.depositMax ?? ''),
          withdrawMin: String(settings.depositWithdraw?.withdrawMin ?? ''),
          withdrawMax: String(settings.depositWithdraw?.withdrawMax ?? ''),
          requireTurnoverForWithdraw: settings.depositWithdraw?.requireTurnoverForWithdraw !== false,
          requireBonusTurnoverForWithdraw:
            settings.depositWithdraw?.requireBonusTurnoverForWithdraw !== false,
        },
        paymentGateway: {
          provider: settings.paymentGateway?.provider || 'manual',
          apiKey: settings.paymentGateway?.apiKey ?? '',
        },
      });
    } catch (error) {
      showToast(error.message || 'Failed to load general settings');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const updateForm = (tabId, key, value) => {
    setForms((current) => ({
      ...current,
      [tabId]: {
        ...current[tabId],
        [key]: value,
      },
    }));
  };

  const buildPayload = (tabId) => {
    if (tabId === 'site') {
      return {
        siteName: forms.site.siteName.trim(),
        currency: forms.site.currency.trim(),
        logoUrl: forms.site.logoUrl.trim(),
        faviconUrl: forms.site.faviconUrl.trim(),
      };
    }

    if (tabId === 'chat') {
      return { enabled: forms.chat.enabled };
    }

    if (tabId === 'deposit-withdraw') {
      return {
        depositMin: Number(forms['deposit-withdraw'].depositMin),
        depositMax: Number(forms['deposit-withdraw'].depositMax),
        withdrawMin: Number(forms['deposit-withdraw'].withdrawMin),
        withdrawMax: Number(forms['deposit-withdraw'].withdrawMax),
        requireTurnoverForWithdraw: forms['deposit-withdraw'].requireTurnoverForWithdraw,
        requireBonusTurnoverForWithdraw: forms['deposit-withdraw'].requireBonusTurnoverForWithdraw,
      };
    }

    return {
      provider: forms.paymentGateway.provider,
      apiKey: forms.paymentGateway.apiKey.trim(),
    };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = buildPayload(currentTab.id);
      await updateAdminGeneralSettingsSection(currentTab.id, payload);
      showToast('Settings saved successfully', 'success');
      await loadSettings();
    } catch (error) {
      showToast(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const renderFields = () => {
    if (currentTab.id === 'commission') {
      return null;
    }

    if (currentTab.id === 'site') {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Site Name">
            <input
              type="text"
              value={forms.site.siteName}
              onChange={(e) => updateForm('site', 'siteName', e.target.value)}
              placeholder="JowaBuzz"
              className={inputClassName()}
            />
          </Field>
          <Field label="Currency">
            <input
              type="text"
              value={forms.site.currency}
              onChange={(e) => updateForm('site', 'currency', e.target.value)}
              placeholder="BDT"
              className={inputClassName()}
            />
          </Field>
          <Field label="Logo URL">
            <input
              type="text"
              value={forms.site.logoUrl}
              onChange={(e) => updateForm('site', 'logoUrl', e.target.value)}
              placeholder="/uploads/logo.png"
              className={`${inputClassName()} md:col-span-2`}
            />
          </Field>
          <Field label="Favicon URL">
            <input
              type="text"
              value={forms.site.faviconUrl}
              onChange={(e) => updateForm('site', 'faviconUrl', e.target.value)}
              placeholder="/uploads/favicon.ico"
              className={`${inputClassName()} md:col-span-2`}
            />
          </Field>
        </div>
      );
    }

    if (currentTab.id === 'commission') {
      return null;
    }

        if (currentTab.id === 'chat') {
      return (
        <AdminChatSettingsPanel
          enabled={forms.chat.enabled}
          onEnabledChange={(value) => updateForm('chat', 'enabled', value)}
          onToast={(message, type) => {
            setToastType(type || 'success');
            setToast(message);
            window.setTimeout(() => setToast(''), 3500);
          }}
          inputClassName={inputClassName}
        />
      );
    }

    if (currentTab.id === 'deposit-withdraw') {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
          <Field label="Minimum Deposit">
            <input
              type="number"
              min="0"
              step="0.01"
              value={forms['deposit-withdraw'].depositMin}
              onChange={(e) => updateForm('deposit-withdraw', 'depositMin', e.target.value)}
              className={inputClassName()}
            />
          </Field>
          <Field label="Maximum Deposit">
            <input
              type="number"
              min="0"
              step="0.01"
              value={forms['deposit-withdraw'].depositMax}
              onChange={(e) => updateForm('deposit-withdraw', 'depositMax', e.target.value)}
              className={inputClassName()}
            />
          </Field>
          <Field label="Minimum Withdraw">
            <input
              type="number"
              min="0"
              step="0.01"
              value={forms['deposit-withdraw'].withdrawMin}
              onChange={(e) => updateForm('deposit-withdraw', 'withdrawMin', e.target.value)}
              className={inputClassName()}
            />
          </Field>
          <Field label="Maximum Withdraw">
            <input
              type="number"
              min="0"
              step="0.01"
              value={forms['deposit-withdraw'].withdrawMax}
              onChange={(e) => updateForm('deposit-withdraw', 'withdrawMax', e.target.value)}
              className={inputClassName()}
            />
          </Field>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Withdraw Turnover Control</h3>
            <p className="mt-1 text-xs text-slate-500">
              Turn off to allow withdraw without turnover check. Turn on again anytime.
            </p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">Main Wallet Turnover Required</p>
                  <p className="text-xs text-slate-500">
                    User must complete deposit turnover before withdraw.
                  </p>
                </div>
                <ToggleSwitch
                  checked={forms['deposit-withdraw'].requireTurnoverForWithdraw}
                  onChange={(value) => updateForm('deposit-withdraw', 'requireTurnoverForWithdraw', value)}
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">Bonus Turnover Required</p>
                  <p className="text-xs text-slate-500">
                    User must complete bonus turnover before withdraw.
                  </p>
                </div>
                <ToggleSwitch
                  checked={forms['deposit-withdraw'].requireBonusTurnoverForWithdraw}
                  onChange={(value) =>
                    updateForm('deposit-withdraw', 'requireBonusTurnoverForWithdraw', value)
                  }
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Payment Provider">
          <select
            value={forms.paymentGateway.provider}
            onChange={(e) => updateForm('paymentGateway', 'provider', e.target.value)}
            className={inputClassName()}
          >
            <option value="manual">Manual</option>
            <option value="winypay">WinyPay (Bangladesh)</option>
            <option value="sslcommerz">SSLCommerz</option>
            <option value="aamarpay">AamarPay</option>
            <option value="shurjopay">ShurjoPay</option>
          </select>
        </Field>
        <Field label="API Key">
          <input
            type="text"
            value={forms.paymentGateway.apiKey}
            onChange={(e) => updateForm('paymentGateway', 'apiKey', e.target.value)}
            placeholder="Enter gateway API key"
            className={inputClassName()}
          />
        </Field>
      </div>
    );
  };

  const tabButtons = (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const active = tab.id === currentTab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            ].join(' ')}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  if (currentTab.id === 'commission') {
    return (
      <>
        <AdminToast message={toast} type={toastType} />
        <div className="space-y-5">
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">General Setting</h2>
          {tabButtons}
          <AdminCommissionSettingTab showToast={showToast} />
        </div>
      </>
    );
  }

  if (currentTab.id === 'gaming-api-gateway') {
    return (
      <>
        <AdminToast message={toast} type={toastType} />
        <div className="space-y-5">
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">General Setting</h2>
          {tabButtons}
          <AdminGamingApiGatewayTab showToast={showToast} />
        </div>
      </>
    );
  }

  if (currentTab.id === 'bulk-sms-api') {
    return (
      <>
        <AdminToast message={toast} type={toastType} />
        <div className="space-y-5">
          <h2 className="text-[28px] font-bold tracking-tight text-slate-900">General Setting</h2>
          {tabButtons}
          <AdminBulkSmsApiTab showToast={showToast} />
        </div>
      </>
    );
  }

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="admin-general-setting-page space-y-5">
        <h2 className="text-[28px] font-bold tracking-tight text-slate-900">General Setting</h2>
        {tabButtons}

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-900">{currentTab.cardTitle}</h3>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving}
              className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

          <div className="p-5">
            {loading ? (
              <p className="text-sm text-slate-500">Loading settings...</p>
            ) : (
              renderFields()
            )}
          </div>
        </div>
      </div>
    </>
  );
}
