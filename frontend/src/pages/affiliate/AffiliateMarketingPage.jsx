import { useCallback, useEffect, useState } from 'react';
import { Copy, Download } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import { fetchAffiliateProfile } from '../../services/affiliateDashboardService';

export default function AffiliateMarketingPage() {
  const [profile, setProfile] = useState(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');

  const showToast = (message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  };

  const load = useCallback(async () => {
    try {
      setProfile(await fetchAffiliateProfile());
    } catch (error) {
      showToast(error.message || 'Failed to load marketing tools');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const mainSiteUrl = (profile?.mainSiteUrl || window.location.origin).replace(/\/$/, '');
  const referralLink = profile
    ? `${mainSiteUrl}/auth?tab=signup&ref=${profile.referralCode}`
    : '';

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied`, 'success');
    } catch {
      showToast('Copy failed');
    }
  };

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-[28px]">Marketing Tools</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm font-semibold text-slate-800">Referral Link</p>
            <p className="mt-3 break-all rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 sm:text-sm">{referralLink || '—'}</p>
            <button type="button" onClick={() => copyText(referralLink, 'Referral link')} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-violet-700 sm:w-auto">
              <Copy size={16} /> Copy Link
            </button>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-sm font-semibold text-slate-800">Referral Code</p>
            <p className="mt-3 text-2xl font-bold tracking-wider text-violet-700 sm:text-3xl">{profile?.referralCode || '—'}</p>
            <button type="button" onClick={() => copyText(profile?.referralCode || '', 'Referral code')} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-100 sm:w-auto">
              <Copy size={16} /> Copy Code
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Promo Banner</p>
              <p className="mt-1 text-sm text-slate-500">Download marketing banner for your campaigns</p>
            </div>
            <a href="/images/promo-banner-placeholder.svg" download className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto">
              <Download size={16} /> Download Banner
            </a>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl bg-gradient-to-r from-violet-700 to-violet-500 p-6 text-center text-white sm:p-8">
            <p className="text-lg font-bold sm:text-xl">Join Jowabuzz</p>
            <p className="mt-2 text-sm text-white/90">Use code: {profile?.referralCode || 'YOURCODE'}</p>
          </div>
        </div>
      </div>
    </>
  );
}
