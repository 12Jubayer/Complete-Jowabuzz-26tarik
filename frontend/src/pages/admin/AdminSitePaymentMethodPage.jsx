import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import SiteConfigurationTabs, {
  SiteConfigurationHeader,
} from '../../components/admin/SiteConfigurationTabs';
import {
  fetchAdminPaymentMethods,
  updateAdminPaymentMethods,
} from '../../services/adminSiteConfigService';

function createEmptyMethod() {
  return {
    clientKey: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: null,
    name: '',
    accountNumber: '',
    isActive: true,
  };
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

export default function AdminSitePaymentMethodPage() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const loadMethods = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminPaymentMethods();
      setMethods(
        (result.data || []).map((row) => ({
          clientKey: `id-${row.id}`,
          id: row.id,
          name: row.name,
          accountNumber: row.accountNumber,
          isActive: row.isActive,
        })),
      );
    } catch (error) {
      showToast(error.message || 'Failed to load payment methods');
      setMethods([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadMethods();
  }, [loadMethods]);

  const updateMethod = (clientKey, patch) => {
    setMethods((current) =>
      current.map((row) => (row.clientKey === clientKey ? { ...row, ...patch } : row)),
    );
  };

  const handleAddMethod = () => {
    setMethods((current) => [...current, createEmptyMethod()]);
  };

  const handleRemoveMethod = (clientKey) => {
    setMethods((current) => current.filter((row) => row.clientKey !== clientKey));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = methods.map((row) => ({
        id: row.id,
        name: row.name,
        accountNumber: row.accountNumber,
        isActive: row.isActive,
      }));

      const result = await updateAdminPaymentMethods(payload);
      showToast('Payment methods updated successfully', 'success');
      setMethods(
        (result.data || []).map((row) => ({
          clientKey: `id-${row.id}`,
          id: row.id,
          name: row.name,
          accountNumber: row.accountNumber,
          isActive: row.isActive,
        })),
      );
    } catch (error) {
      showToast(error.message || 'Failed to save payment methods');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="space-y-5">
        <SiteConfigurationHeader />
        <SiteConfigurationTabs />

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Payment Methods</h3>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading payment methods...</div>
          ) : (
            <div className="mt-5 space-y-4">
              {methods.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                  No payment methods yet. Click &quot;Add Method&quot; to create one.
                </div>
              ) : (
                methods.map((row) => (
                  <div
                    key={row.clientKey}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">Name</span>
                        <input
                          type="text"
                          value={row.name}
                          onChange={(event) =>
                            updateMethod(row.clientKey, { name: event.target.value })
                          }
                          disabled={saving}
                          className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          placeholder="bKash"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">
                          Account Number
                        </span>
                        <input
                          type="text"
                          value={row.accountNumber}
                          onChange={(event) =>
                            updateMethod(row.clientKey, { accountNumber: event.target.value })
                          }
                          disabled={saving}
                          className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          placeholder="01xxxxxxxxxx"
                        />
                      </label>

                      <div className="flex items-center gap-3 pb-1">
                        <ToggleSwitch
                          checked={row.isActive}
                          onChange={(isActive) => updateMethod(row.clientKey, { isActive })}
                          disabled={saving}
                        />
                        <span className="text-sm font-medium text-slate-700">
                          {row.isActive ? 'On' : 'Off'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveMethod(row.clientKey)}
                        disabled={saving}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50 lg:mb-0.5"
                        aria-label="Delete payment method"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}

              <button
                type="button"
                onClick={handleAddMethod}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Plus size={16} />
                Add Method
              </button>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
