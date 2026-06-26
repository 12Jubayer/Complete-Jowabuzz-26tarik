import { useCallback, useEffect, useState } from 'react';
import { KeyRound, RefreshCw } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import {
  approveAdminAffiliate,
  blockAdminAffiliate,
  changeAffiliatePassword,
  fetchAdminAffiliateUsers,
  rejectAdminAffiliate,
  updateAdminAffiliateCommission,
} from '../../services/adminAffiliateService';

const COMMISSION_OPTIONS = [5, 10, 15, 20, 25, 30];

function statusClass(status) {
  const map = {
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-red-50 text-red-600 border-red-200',
    blocked: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return map[status] || map.pending;
}

export default function AdminAffiliateUsersPage() {
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');
  const [passwordModal, setPasswordModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const showToast = (message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  };

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchAdminAffiliateUsers();
      setAffiliates(data.affiliates || []);
    } catch (error) {
      showToast(error.message || 'Failed to load affiliates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (action, affiliateId) => {
    try {
      if (action === 'approve') await approveAdminAffiliate(affiliateId);
      if (action === 'reject') await rejectAdminAffiliate(affiliateId);
      if (action === 'block') await blockAdminAffiliate(affiliateId);
      showToast(`Affiliate ${action}d successfully`, 'success');
      await load({ silent: true });
    } catch (error) {
      showToast(error.message || 'Action failed');
    }
  };

  const handleCommissionChange = async (affiliateId, commissionPercent) => {
    try {
      await updateAdminAffiliateCommission(affiliateId, Number(commissionPercent));
      showToast('Commission updated', 'success');
      await load({ silent: true });
    } catch (error) {
      showToast(error.message || 'Failed to update commission');
    }
  };

  const handlePasswordSave = async () => {
    setSavingPassword(true);
    try {
      await changeAffiliatePassword({
        affiliateId: passwordModal.id,
        newPassword,
        confirmPassword,
      });
      showToast('Password changed successfully', 'success');
      setPasswordModal(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      showToast(error.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Affiliate Users</h2>
            <p className="mt-1 text-sm text-slate-500">Manage affiliate accounts, approval, and commission</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              load({ silent: true });
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Affiliate ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone/Email</th>
                  <th className="px-4 py-3">Referral Code</th>
                  <th className="px-4 py-3">Commission %</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created At</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Loading...</td></tr>
                ) : affiliates.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No affiliates found</td></tr>
                ) : (
                  affiliates.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{row.id}</td>
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3">
                        <div>{row.phone}</div>
                        <div className="text-xs text-slate-400">{row.email || '—'}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-violet-700">{row.referralCode}</td>
                      <td className="px-4 py-3">
                        <select
                          value={row.commissionPercent}
                          onChange={(e) => handleCommissionChange(row.id, e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                        >
                          {COMMISSION_OPTIONS.map((pct) => (
                            <option key={pct} value={pct}>{pct}%</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusClass(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.status !== 'approved' && (
                            <button type="button" onClick={() => handleAction('approve', row.id)} className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">Approve</button>
                          )}
                          {row.status !== 'rejected' && (
                            <button type="button" onClick={() => handleAction('reject', row.id)} className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100">Reject</button>
                          )}
                          {row.status !== 'blocked' && (
                            <button type="button" onClick={() => handleAction('block', row.id)} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">Block</button>
                          )}
                          <button type="button" onClick={() => setPasswordModal(row)} className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100">
                            <KeyRound size={12} /> Password
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

      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
            <p className="mt-1 text-sm text-slate-500">{passwordModal.name} (#{passwordModal.id})</p>
            <div className="mt-4 space-y-3">
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPasswordModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handlePasswordSave} disabled={savingPassword} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
                {savingPassword ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
