import { useEffect, useState } from 'react';
import AuthToast from '../../components/AuthToast';
import ProfilePageShell from '../../components/profile/ProfilePageShell';
import { fetchUserProfile, submitProfileUpdateRequest } from '../../services/userProfileService';

const INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-violet-500';

export default function ProfilePersonalInfoPage() {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchUserProfile().then((data) => {
      setProfile(data);
      setName(data.name || '');
      setPhone(data.phone || '');
    });
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (name !== profile?.name) {
        await submitProfileUpdateRequest({ fieldName: 'name', newValue: name });
      }
      if (phone !== profile?.phone) {
        await submitProfileUpdateRequest({ fieldName: 'phone', newValue: phone });
      }
      setToast('Update request submitted for admin approval');
    } catch (error) {
      setToast(error.message || 'Failed to submit');
    }
    window.setTimeout(() => setToast(''), 3000);
  };

  return (
    <ProfilePageShell title="Personal information">
      <AuthToast message={toast} />
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm text-sm space-y-2">
        <p><span className="text-slate-500">Provider Player ID:</span> {profile?.providerUsername || '—'}</p>
        <p><span className="text-slate-500">Phone:</span> {profile?.phone}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Phone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={INPUT} />
        </label>
        <button type="submit" className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white">
          Request Update
        </button>
      </form>
    </ProfilePageShell>
  );
}
