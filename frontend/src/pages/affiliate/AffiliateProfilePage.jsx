import { useCallback, useEffect, useState } from 'react';
import AdminToast from '../../components/admin/AdminToast';
import {
  fetchAffiliateProfile,
  updateAffiliateSettlementUser,
} from '../../services/affiliateDashboardService';

function statusBadge(status) {
  const map = {
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-red-50 text-red-600 border-red-200',
    blocked: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return map[status] || map.pending;
}

export default function AffiliateProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [editingSettlement, setEditingSettlement] = useState(false);
  const [settlementUserIdInput, setSettlementUserIdInput] = useState('');
  const [savingSettlement, setSavingSettlement] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProfile(await fetchAffiliateProfile());
    } catch (error) {
      setToast(error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEditSettlement = () => {
    setSettlementUserIdInput(
      profile?.settlementUserId ? String(profile.settlementUserId) : '',
    );
    setEditingSettlement(true);
  };

  const cancelEditSettlement = () => {
    setEditingSettlement(false);
    setSettlementUserIdInput('');
  };

  const saveSettlementUserId = async () => {
    const trimmed = settlementUserIdInput.trim();
    if (!trimmed) {
      setToast('Settlement Player User ID is required');
      window.setTimeout(() => setToast(''), 4000);
      return;
    }

    setSavingSettlement(true);
    try {
      const result = await updateAffiliateSettlementUser(trimmed);
      setProfile((prev) => ({
        ...prev,
        settlementUserId: result.settlementUserId,
        settlementUserName: result.settlementUserName,
      }));
      setEditingSettlement(false);
      setToast('Settlement Player User ID updated successfully');
      window.setTimeout(() => setToast(''), 4000);
    } catch (error) {
      setToast(error.message || 'Failed to update settlement Player User ID');
      window.setTimeout(() => setToast(''), 4000);
    } finally {
      setSavingSettlement(false);
    }
  };

  return (
    <>
      <AdminToast message={toast} />

      <div className="mx-auto max-w-3xl space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-[28px]">Profile</h2>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
          {loading ? (
            <p className="text-slate-400">Loading...</p>
          ) : (
            <dl className="space-y-4 text-sm">
              {[
                ['Affiliate ID', profile?.id],
                ['User ID', profile?.userId],
                ['Name', profile?.name],
                ['Phone', profile?.phone],
                ['Email', profile?.email || '—'],
                ['Referral Code', profile?.referralCode],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-col gap-1 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <dt className="font-medium text-slate-500">{label}</dt>
                  <dd className="font-semibold break-all text-slate-800 sm:text-right">{value}</dd>
                </div>
              ))}

              <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <dt className="font-medium text-slate-500">Settlement Player User ID</dt>
                <dd className="w-full sm:max-w-md sm:text-right">
                  {editingSettlement ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={settlementUserIdInput}
                        onChange={(event) =>
                          setSettlementUserIdInput(event.target.value.replace(/\D/g, ''))
                        }
                        placeholder="Enter active player User ID"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                      <p className="text-left text-xs leading-relaxed text-slate-500">
                        Active player account-এর User ID দিলে Affiliate settlement/commission টাকা ওই player wallet/balance-এ যাবে।
                      </p>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditSettlement}
                          disabled={savingSettlement}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveSettlementUserId}
                          disabled={savingSettlement}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          {savingSettlement ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <span className="font-semibold break-all text-slate-800">
                        {profile?.settlementUserId || '—'}
                        {profile?.settlementUserName ? (
                          <span className="ml-1 font-normal text-slate-500">
                            ({profile.settlementUserName})
                          </span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        onClick={startEditSettlement}
                        className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        Edit/Change
                      </button>
                    </div>
                  )}
                </dd>
              </div>

              {[
                ['Status', profile?.status],
                ['Joined', profile?.createdAt ? new Date(profile.createdAt).toLocaleString() : '—'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <dt className="font-medium text-slate-500">{label}</dt>
                  <dd className="font-semibold break-all text-slate-800 sm:text-right">
                    {label === 'Status' ? (
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(value)}`}
                      >
                        {value}
                      </span>
                    ) : (
                      value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </>
  );
}
