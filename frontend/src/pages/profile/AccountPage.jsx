import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Award,
  Banknote,
  Clock3,
  Copy,
  Crown,
  Eye,
  EyeOff,
  Gift,
  Headphones,
  KeyRound,
  LogOut,
  Mail,
  MessageCircle,
  RefreshCw,
  Repeat,
  Share2,
  Smartphone,
  Ticket,
  Timer,
  User,
  Users,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthToast from '../../components/AuthToast';
import ProfileGridSection from '../../components/profile/ProfileGridSection';
import { apkDownloadPath, contactLinks } from '../../config/siteLinks';
import { featureFlags } from '../../config/featureFlags';
import { useAuth } from '../../context/AuthContext';
import { useSiteBranding } from '../../context/SiteBrandingContext';
import { fetchUserProfile } from '../../services/userProfileService';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function resolvePlayerDisplayId(phone = '', userId = '') {
  const rawPhone = String(phone).trim();
  const phoneDigits = rawPhone.replace(/\D/g, '');
  const isGameUsername = /^[a-z]{10}$/i.test(rawPhone);
  const looksLikePhone =
    !isGameUsername && phoneDigits.length >= 9 && phoneDigits.length <= 13;

  if (looksLikePhone) return phoneDigits;
  if (userId) return String(userId);
  return rawPhone;
}

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, logout, syncUser, loggedIn } = useAuth();
  const { currencySymbol } = useSiteBranding();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  };

  const loadProfile = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchUserProfile();
      setProfile(data);
      syncUser({
        id: data.id,
        username: data.username,
        name: data.name,
        phone: data.phone,
        balance: data.balance,
        referralCode: data.referralCode,
        providerUsername: data.providerUsername,
      });
    } catch (error) {
      showToast(error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [syncUser]);

  useEffect(() => {
    if (!loggedIn) {
      setLoading(false);
      return;
    }
    loadProfile();
  }, [loggedIn, loadProfile]);

  const displayName = profile?.username || user?.username || 'User';
  const displayPhone = profile?.phone || user?.phone || '';
  const displayId =
    profile?.providerUsername
    || user?.providerUsername
    || (profile?.id ?? user?.id ?? '');
  const balance = profile?.balance ?? user?.balance ?? 0;
  const wallet = profile?.wallet;
  const requiredTurnover = Number(wallet?.requiredTurnover ?? 0);
  const completedTurnover = Number(wallet?.completedTurnover ?? 0);
  const turnoverProgressPercent =
    requiredTurnover > 0
      ? Math.min(100, Math.round((completedTurnover / requiredTurnover) * 100))
      : 100;
  const turnoverIncomplete =
    featureFlags.requireTurnoverForWithdraw && wallet && !wallet.turnoverComplete;

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(displayId);
      showToast('ID copied');
    } catch {
      showToast('Copy failed');
    }
  };

  const handleDownloadApk = () => {
    const link = document.createElement('a');
    link.href = apkDownloadPath;
    link.download = 'jowabuzz.apk';
    link.click();
    setTimeout(() => {
      showToast('App file not uploaded yet');
    }, 300);
  };

  const handleLogout = () => {
    logout();
  };

  const openExternal = (url) => window.open(url, '_blank', 'noopener,noreferrer');

  if (loading && !profile) {
    return (
      <div className="mx-auto min-h-screen max-w-md animate-pulse bg-[#eef1f4] p-4">
        <div className="h-36 rounded-2xl bg-slate-200" />
        <div className="mt-4 h-20 rounded-2xl bg-slate-200" />
        <div className="mt-4 h-24 rounded-2xl bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#eef1f4] pb-24 md:py-6">
      <AuthToast message={toast} />

      <div className="mx-auto w-full max-w-md space-y-3 px-3 md:rounded-[28px] md:bg-transparent md:px-0">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7c3aed] via-[#6d28d9] to-[#5b21b6] p-4 text-white shadow-lg">
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/15"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/80 text-xl font-bold text-emerald-400">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-bold">{displayName}</p>
              <button
                type="button"
                onClick={handleCopyId}
                className="mt-1 inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1 text-xs"
              >
                ID: {displayId}
                <Copy size={12} />
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-emerald-600">Main wallet</span>
              <button
                type="button"
                onClick={() => {
                  setRefreshing(true);
                  loadProfile({ silent: true });
                }}
                className="text-slate-400"
                aria-label="Refresh balance"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={() => setHideBalance((v) => !v)}
                className="text-slate-400"
                aria-label="Toggle balance"
              >
                {hideBalance ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xl font-bold text-slate-900">
              {hideBalance ? `${currencySymbol} ••••` : `${currencySymbol} ${formatMoney(balance)}`}
            </p>
          </div>
        </div>

        {(requiredTurnover > 0 || completedTurnover > 0) ? (
          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Timer size={16} className="text-blue-600" />
                <span className="text-sm font-semibold text-slate-800">Turnover</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/profile/turnover')}
                className="text-xs font-medium text-violet-600"
              >
                Details →
              </button>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Progress</span>
                <span>
                  {currencySymbol}{formatMoney(completedTurnover)} / {currencySymbol}
                  {formatMoney(requiredTurnover)} ({turnoverProgressPercent}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${turnoverProgressPercent}%` }}
                />
              </div>
              {turnoverIncomplete ? (
                <p className="mt-1 text-[11px] text-amber-600">Complete turnover to unlock withdrawal</p>
              ) : (
                <p className="mt-1 text-[11px] text-emerald-600">Turnover complete</p>
              )}
            </div>
          </div>
        ) : null}

                <div className="rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] p-4 text-white shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                <Crown size={18} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-white/70">VIP Level</p>
                <p className="font-bold">{wallet?.vipLabel || 'VIP 0'}</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate('/vip')} className="text-sm text-white/90">
              View →
            </button>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-white/80">
              <span>EXP {(wallet?.vipExp ?? 0).toLocaleString()}</span>
              <span>
                Next:{' '}
                {wallet?.nextVipExp != null
                  ? Number(wallet.nextVipExp).toLocaleString()
                  : 'Max level'}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{
                  width: `${wallet?.nextVipExp != null ? wallet?.progressPercent ?? 0 : 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-blue-500" />
            <h3 className="text-sm font-semibold text-slate-800">Funds</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate('/profile/deposit')}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 py-4 hover:bg-slate-50"
            >
              <ArrowDownToLine className="text-emerald-600" size={22} />
              <span className="text-sm font-semibold text-emerald-600">Deposit</span>
            </button>
            <button
              type="button"
              onClick={() => !turnoverIncomplete && navigate('/withdraw')}
              disabled={turnoverIncomplete}
              className={`flex flex-col items-center gap-1 rounded-xl border border-slate-100 py-4 ${
                turnoverIncomplete ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-50'
              }`}
            >
              <ArrowUpFromLine className="text-slate-500" size={22} />
              <span className="text-sm font-semibold text-slate-600">Withdraw</span>
              {turnoverIncomplete ? (
                <span className="text-[10px] text-red-500">Turnover incomplete</span>
              ) : null}
            </button>
          </div>
        </section>

        <ProfileGridSection
          title="History"
          items={[
            { id: 'betting', label: 'Betting record', icon: <Clock3 size={20} />, onClick: () => navigate('/profile/betting-record') },
            { id: 'turnover', label: 'Turnover', icon: <Timer size={20} />, onClick: () => navigate('/profile/turnover') },
            { id: 'transfer', label: 'Transfer record', icon: <Banknote size={20} />, onClick: () => navigate('/profile/transfer-record') },
            { id: 'bonus', label: 'Bonus', icon: <Gift size={20} />, onClick: () => navigate('/profile/bonus') },
            { id: 'transactions', label: 'Transaction records', icon: <Repeat size={20} />, onClick: () => navigate('/profile/transactions') },
          ]}
        />

        <ProfileGridSection
          title="Events"
          items={[
            { id: 'voucher', label: 'Claim voucher', icon: <Ticket size={20} />, onClick: () => navigate('/profile/events/voucher') },
            { id: 'awards', label: 'Awards', icon: <Award size={20} />, onClick: () => navigate('/profile/events/awards') },
          ]}
        />

        <ProfileGridSection
          title="Profile"
          items={[
            { id: 'personal', label: 'Personal information', icon: <User size={20} />, onClick: () => navigate('/profile/personal-info') },
            { id: 'password', label: 'Change password', icon: <KeyRound size={20} />, onClick: () => navigate('/profile/change-password') },
            { id: 'bank', label: 'Bank details', icon: <Banknote size={20} />, onClick: () => navigate('/profile/bank-details') },
            { id: 'inbox', label: 'Inbox message', icon: <Mail size={20} />, onClick: () => navigate('/profile/inbox') },
            { id: 'recommendation', label: 'Recommendation', icon: <Users size={20} />, onClick: () => navigate('/profile/recommendation') },
            { id: 'referral-bonus', label: 'Referral Bonus', icon: <Share2 size={20} />, onClick: () => navigate('/profile/referral-bonus') },
          ]}
        />

        <ProfileGridSection
          title="Contact us"
          items={[
            { id: 'support', label: '24/7 support', icon: <Headphones size={20} />, onClick: () => openExternal(contactLinks.support) },
            { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={20} />, onClick: () => openExternal(contactLinks.whatsapp) },
            { id: 'telegram', label: 'Telegram', icon: <Share2 size={20} />, onClick: () => openExternal(contactLinks.telegram) },
            { id: 'facebook', label: 'Facebook', icon: <Users size={20} />, onClick: () => openExternal(contactLinks.facebook) },
          ]}
        />

        <ProfileGridSection
          title="Download"
          items={[
            { id: 'android', label: 'Download Android', icon: <Smartphone size={20} />, onClick: handleDownloadApk },
          ]}
        />

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>

      <button
        type="button"
        onClick={() => openExternal(contactLinks.support)}
        className="fixed bottom-6 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#0ea5e9] text-white shadow-lg md:right-[calc(50%-220px)]"
        aria-label="Live chat"
      >
        <MessageCircle size={24} />
      </button>
    </div>
  );
}
