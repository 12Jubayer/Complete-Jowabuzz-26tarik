import { useState } from 'react';
import AuthToast from '../../components/AuthToast';
import ProfilePageShell from '../../components/profile/ProfilePageShell';
import { submitChangePassword } from '../../services/userProfileService';

const INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-violet-500';

export default function ProfileChangePasswordPage() {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [toast, setToast] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await submitChangePassword(form);
      setToast('Password changed successfully');
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setToast(error.message || 'Failed to change password');
    }
    window.setTimeout(() => setToast(''), 3000);
  };

  return (
    <ProfilePageShell title="Change password">
      <AuthToast message={toast} />
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        {['oldPassword', 'newPassword', 'confirmPassword'].map((field) => (
          <label key={field} className="block">
            <span className="mb-1.5 block text-sm font-medium capitalize text-slate-700">
              {field.replace(/([A-Z])/g, ' $1')}
            </span>
            <input
              type="password"
              value={form[field]}
              onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
              className={INPUT}
            />
          </label>
        ))}
        <button type="submit" className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white">
          Save Password
        </button>
      </form>
    </ProfilePageShell>
  );
}
