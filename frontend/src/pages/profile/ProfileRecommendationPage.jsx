import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import AuthToast from '../../components/AuthToast';
import ProfilePageShell from '../../components/profile/ProfilePageShell';
import { fetchReferralInfo } from '../../services/userProfileService';

export default function ProfileRecommendationPage() {
  const [data, setData] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchReferralInfo().then(setData).catch(() => {});
  }, []);

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(`${label} copied`);
    } catch {
      setToast('Copy failed');
    }
    window.setTimeout(() => setToast(''), 2500);
  };

  return (
    <ProfilePageShell title="Recommendation">
      <AuthToast message={toast} />
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">Referral Code</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-2xl font-bold text-violet-700">{data?.referralCode || '—'}</p>
            <button type="button" onClick={() => copy(data?.referralCode || '', 'Code')} className="rounded-lg bg-violet-50 p-2 text-violet-700">
              <Copy size={16} />
            </button>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">Referral Link</p>
          <p className="mt-2 break-all text-sm text-slate-600">{data?.referralLink || '—'}</p>
          <button type="button" onClick={() => copy(data?.referralLink || '', 'Link')} className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white">
            Copy Link
          </button>
        </div>
      </div>
    </ProfilePageShell>
  );
}
