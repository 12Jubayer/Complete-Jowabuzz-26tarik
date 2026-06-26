import { useCallback, useEffect, useState } from 'react';
import AdminToast from '../../components/admin/AdminToast';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  fetchAdminProfile,
  updateAdminProfile,
  updateAdminProfilePassword,
} from '../../services/adminProfileService';
import { getAdminToken, setAdminSession } from '../../utils/adminAuth';

export default function AdminProfilePage() {
  const { admin, login } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');

  const showToast = useCallback((message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminProfile();
      const profile = result.data || {};
      setEmail(profile.email || admin?.email || '');
      setName(profile.name || '');
    } catch (error) {
      showToast(error.message || 'Failed to load profile');
      setEmail(admin?.email || '');
      setName('');
    } finally {
      setLoading(false);
    }
  }, [admin?.email, showToast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveProfile = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('Name is required');
      return;
    }

    setSavingProfile(true);
    try {
      const result = await updateAdminProfile(trimmedName);
      const profile = result.data || {};
      setName(profile.name || trimmedName);
      setEmail(profile.email || email);

      const token = getAdminToken();
      const updatedUser = {
        ...admin,
        email: profile.email || email,
        name: profile.name || trimmedName,
      };
      if (token) {
        setAdminSession(updatedUser, token);
      }
      login(updatedUser);

      showToast(result.message || 'Profile updated successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showToast('Password must be at least 6 characters');
      return;
    }

    setSavingPassword(true);
    try {
      const result = await updateAdminProfilePassword(newPassword);
      setNewPassword('');
      showToast(result.message || 'Password updated successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="space-y-5">
        <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Profile</h2>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <h3 className="text-lg font-semibold text-slate-900">Update profile</h3>
          <p className="mt-2 text-sm text-slate-500">
            Email: <span className="font-medium text-slate-700">{email || '—'}</span>
          </p>

          <label className="mt-5 block max-w-xl">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={loading || savingProfile}
              placeholder="Admin"
              className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900"
            />
          </label>

          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={loading || savingProfile}
            className="mt-5 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {savingProfile ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <h3 className="text-lg font-semibold text-slate-900">Change password</h3>

          <label className="mt-5 block max-w-xl">
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={loading || savingPassword}
              placeholder="New password"
              className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900"
            />
          </label>

          <button
            type="button"
            onClick={handleUpdatePassword}
            disabled={loading || savingPassword}
            className="mt-5 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {savingPassword ? 'Updating...' : 'Update password'}
          </button>
        </div>
      </div>
    </>
  );
}
