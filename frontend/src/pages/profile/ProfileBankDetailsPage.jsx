import { useEffect, useState } from 'react';
import AuthToast from '../../components/AuthToast';
import ProfilePageShell from '../../components/profile/ProfilePageShell';
import { fetchBankDetails, saveBankDetails } from '../../services/userProfileService';

const INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-violet-500';

export default function ProfileBankDetailsPage() {
  const [form, setForm] = useState({ method: 'bank', accountName: '', accountNumber: '', bankName: '' });
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchBankDetails().then((data) => {
      if (data.bankDetails) setForm((prev) => ({ ...prev, ...data.bankDetails }));
    }).catch(() => {});
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await saveBankDetails(form);
      setToast('Bank details saved');
    } catch (error) {
      setToast(error.message || 'Failed to save');
    }
    window.setTimeout(() => setToast(''), 3000);
  };

  return (
    <ProfilePageShell title="Bank details">
      <AuthToast message={toast} />
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Method</span>
          <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className={INPUT}>
            <option value="bank">Bank</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
          </select>
        </label>
        <input placeholder="Account name" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} className={INPUT} />
        <input placeholder="Account number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className={INPUT} />
        <input placeholder="Bank name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className={INPUT} />
        <button type="submit" className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white">Save</button>
      </form>
    </ProfilePageShell>
  );
}
