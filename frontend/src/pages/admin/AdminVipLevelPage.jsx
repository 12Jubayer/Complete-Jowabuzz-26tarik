import { useCallback, useEffect, useState } from 'react';
import { Check, Crown, Plus, Save, Trash2 } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import {
  bulkUpdateAdminVipLevels,
  createAdminVipLevel,
  deleteAdminVipLevel,
  fetchAdminVipLevels,
  updateAdminVipLevel,
} from '../../services/adminVipLevelService';

function createDraftRow(row) {
  return {
    id: row.id,
    level: row.level,
    expRequired: String(row.expRequired ?? 0),
    levelUpReward: String(row.levelUpReward ?? 0),
    monthlyReward: String(row.monthlyReward ?? 0),
    safePercent: String(row.safePercent ?? 0),
    isActive: row.isActive !== false,
  };
}

function ActiveCheckbox({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'inline-flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
        checked
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : 'border-slate-300 bg-white text-transparent',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      ].join(' ')}
    >
      <Check size={13} strokeWidth={3} />
    </button>
  );
}

export default function AdminVipLevelPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [addingLevel, setAddingLevel] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const loadLevels = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminVipLevels();
      setRows((result.data || []).map(createDraftRow));
    } catch (error) {
      showToast(error.message || 'Failed to load VIP levels');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadLevels();
  }, [loadLevels]);

  const updateRow = (id, patch) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const buildPayload = (row) => ({
    level: Number(row.level),
    expRequired: Number(row.expRequired || 0),
    levelUpReward: Number(row.levelUpReward || 0),
    monthlyReward: Number(row.monthlyReward || 0),
    safePercent: Number(row.safePercent || 0),
    isActive: row.isActive,
  });

  const handleAddLevel = async () => {
    const nextLevel = rows.length ? Math.max(...rows.map((row) => Number(row.level))) + 1 : 0;

    setAddingLevel(true);
    try {
      const result = await createAdminVipLevel({
        level: nextLevel,
        expRequired: 0,
        levelUpReward: 0,
        monthlyReward: 0,
        safePercent: 0,
        isActive: true,
      });
      setRows((current) => [...current, createDraftRow(result.data)]);
      showToast('VIP level added', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to add VIP level');
    } finally {
      setAddingLevel(false);
    }
  };

  const handleSaveRow = async (row) => {
    setSavingId(row.id);
    try {
      const result = await updateAdminVipLevel(row.id, buildPayload(row));
      setRows((current) =>
        current.map((item) => (item.id === row.id ? createDraftRow(result.data) : item)),
      );
      showToast(`VIP ${row.level} saved`, 'success');
    } catch (error) {
      showToast(error.message || 'Failed to save VIP level');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      const result = await bulkUpdateAdminVipLevels(
        rows.map((row, index) => ({
          id: row.id,
          ...buildPayload(rows[index]),
        })),
      );
      setRows((result.data || []).map(createDraftRow));
      showToast('All VIP levels saved', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to save VIP levels');
    } finally {
      setSavingAll(false);
    }
  };

  const handleDeleteRow = async (row) => {
    if (!window.confirm(`Delete VIP ${row.level}?`)) return;

    setDeletingId(row.id);
    try {
      await deleteAdminVipLevel(row.id);
      setRows((current) => current.filter((item) => item.id !== row.id));
      showToast('VIP level deleted', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to delete VIP level');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="admin-vip-level-page space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <Crown className="text-emerald-500" size={22} strokeWidth={2.2} />
              <h2 className="text-[26px] font-bold tracking-tight text-slate-900">
                VIP Level Configuration
              </h2>
            </div>
            <p className="mt-1.5 text-sm text-slate-500">
              EXP, level-up rewards, monthly rewards, and safe % per VIP tier.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleAddLevel}
              disabled={addingLevel || loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              <Plus size={16} />
              {addingLevel ? 'Adding...' : 'Add Level'}
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={savingAll || loading || rows.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              <Save size={16} />
              {savingAll ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] table-fixed text-sm">
              <colgroup>
                <col className="w-[110px]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col className="w-[12%]" />
                <col className="w-[90px]" />
                <col className="w-[110px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-white text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3.5">Level</th>
                  <th className="px-4 py-3.5">EXP Required</th>
                  <th className="px-4 py-3.5">Level-up Reward (৳)</th>
                  <th className="px-4 py-3.5">Monthly Reward (৳)</th>
                  <th className="px-4 py-3.5">Safe %</th>
                  <th className="px-4 py-3.5 text-center">Active</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      Loading VIP levels...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      No VIP levels configured yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3">
                        <span className="inline-flex min-w-[68px] items-center justify-center rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white">
                          VIP {row.level}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={row.expRequired}
                          onChange={(event) => updateRow(row.id, { expRequired: event.target.value })}
                          className="admin-vip-level-input w-full rounded-md px-3 py-2 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.levelUpReward}
                          onChange={(event) => updateRow(row.id, { levelUpReward: event.target.value })}
                          className="admin-vip-level-input w-full rounded-md px-3 py-2 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.monthlyReward}
                          onChange={(event) => updateRow(row.id, { monthlyReward: event.target.value })}
                          className="admin-vip-level-input w-full rounded-md px-3 py-2 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.safePercent}
                          onChange={(event) => updateRow(row.id, { safePercent: event.target.value })}
                          className="admin-vip-level-input w-full rounded-md px-3 py-2 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ActiveCheckbox
                          checked={row.isActive}
                          onChange={(value) => updateRow(row.id, { isActive: value })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveRow(row)}
                            disabled={savingId === row.id}
                            title="Save"
                            aria-label="Save VIP level"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60"
                          >
                            <Save size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row)}
                            disabled={deletingId === row.id}
                            title="Delete"
                            aria-label="Delete VIP level"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-60"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
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
