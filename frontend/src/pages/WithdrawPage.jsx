import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Building2, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthToast from '../components/AuthToast';
import Header from '../components/Header';
import PlayerMobileNav from '../components/PlayerMobileNav';
import { colors } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { useSiteBranding } from '../context/SiteBrandingContext';
import { fetchPublicDepositWithdrawRules } from '../services/adminGeneralSettingsService';
import {
  confirmUserWithdraw,
  fetchUserProfile,
  requestUserWithdrawOtp,
} from '../services/userProfileService';
import {
  fetchPlayerAgentWithdrawRequests,
  requestPlayerAgentWithdrawOtp,
} from '../services/userAgentWithdrawService';

const INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500';

const TAB_BUTTON =
  'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-colors';

function formatMoney(value, currencySymbol = '৳') {
  return `${currencySymbol}${Number(value || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-BD', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status) {
  if (status === 'pending') return 'Pending';
  if (status === 'completed') return 'Completed';
  if (status === 'expired') return 'Expired';
  if (status === 'cancelled') return 'Cancelled';
  return status;
}

function statusClass(status) {
  if (status === 'pending') return 'bg-amber-100 text-amber-800';
  if (status === 'completed') return 'bg-emerald-100 text-emerald-800';
  return 'bg-slate-100 text-slate-600';
}

function PaymentGatewayWithdrawTab({ currencySymbol, rules, turnoverIncomplete }) {
  const [amount, setAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [method, setMethod] = useState('bkash');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('form');
  const [demoOtp, setDemoOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  };

  const handleRequestOtp = async (event) => {
    event.preventDefault();
    if (turnoverIncomplete) return;
    setSubmitting(true);
    try {
      const result = await requestUserWithdrawOtp(Number(amount));
      setDemoOtp(result.demoOtp || '');
      setStep('otp');
      showToast('OTP sent to your phone');
    } catch (error) {
      showToast(error.message || 'Failed to send OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmWithdraw = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await confirmUserWithdraw({
        amount: Number(amount),
        method,
        accountNumber,
        otp: otp.trim(),
      });
      showToast('Withdraw request submitted');
      setStep('form');
      setOtp('');
      setAmount('');
      setAccountNumber('');
    } catch (error) {
      showToast(error.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (turnoverIncomplete) {
    return (
      <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600">
        Turnover incomplete. Complete turnover before withdrawing.
      </div>
    );
  }

  return (
    <>
      <AuthToast message={toast} />
      {step === 'form' ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Method</span>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={INPUT}>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="bank">Bank</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Account number</span>
            <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className={INPUT} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Amount ({currencySymbol})</span>
            <input
              type="number"
              min={rules?.withdrawMin ?? 1}
              max={rules?.withdrawMax ?? undefined}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={INPUT}
            />
            {rules ? (
              <p className="mt-1.5 text-xs text-slate-500">
                Allowed range: {currencySymbol}
                {Number(rules.withdrawMin).toLocaleString()} – {currencySymbol}
                {Number(rules.withdrawMax).toLocaleString()}
              </p>
            ) : null}
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Sending OTP...' : 'Next — Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleConfirmWithdraw} className="space-y-4">
          {demoOtp ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Demo OTP: <strong>{demoOtp}</strong>
            </div>
          ) : null}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">OTP (6 digits)</span>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={INPUT}
              placeholder="Enter OTP from SMS"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Confirm Withdraw'}
          </button>
          <button
            type="button"
            onClick={() => setStep('form')}
            className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700"
          >
            Back
          </button>
        </form>
      )}
    </>
  );
}

function AgentWithdrawTab({ currencySymbol, rules, turnoverIncomplete, onGenerated }) {
  const [amount, setAmount] = useState('');
  const [agentUid, setAgentUid] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [formError, setFormError] = useState('');
  const [copied, setCopied] = useState(false);

  const showToast = (message, type = 'success') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  };

  const handleCopyOtp = async () => {
    if (!generatedOtp) return;
    try {
      await navigator.clipboard.writeText(generatedOtp);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Copy failed');
    }
  };

  const handleGenerateOtp = async (event) => {
    event.preventDefault();
    setFormError('');

    if (turnoverIncomplete) {
      showToast('Turnover incomplete', 'error');
      return;
    }

    const numericAmount = Number(amount);
    const trimmedUid = agentUid.trim();

    if (!numericAmount || numericAmount <= 0) {
      setFormError('Enter a valid amount');
      return;
    }

    if (!trimmedUid) {
      setFormError('Enter Agent UID');
      return;
    }

    setSubmitting(true);
    setGeneratedOtp('');
    setCopied(false);

    try {
      const result = await requestPlayerAgentWithdrawOtp(numericAmount, trimmedUid);
      const otp = String(result.otp || result.demoOtp || '').trim();
      if (!otp) {
        throw new Error('OTP was not returned. Please try again.');
      }
      setGeneratedOtp(otp);
      showToast('OTP generated successfully');
      onGenerated?.(otp, result);
    } catch (error) {
      const message = error.message || 'Failed to generate OTP';
      setFormError(message);
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (turnoverIncomplete) {
    return (
      <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600">
        Turnover incomplete. Complete turnover before withdrawing.
      </div>
    );
  }

  return (
    <>
      <AuthToast message={toast} type={toastType} />
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Withdraw via Agent</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Amount + Agent UID দিন, Generate OTP ক্লিক করলে OTP screen-এ দেখাবে। এজেন্টকে OTP
            দিলে ক্যাশ আউট হবে। OTP ১৫ মিনিট valid।
          </p>
        </div>

        <form onSubmit={handleGenerateOtp} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Amount ({currencySymbol})</span>
            <input
              type="number"
              min={rules?.withdrawMin ?? 1}
              max={rules?.withdrawMax ?? undefined}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setFormError('');
              }}
              className={INPUT}
              placeholder="0"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Agent UID</span>
            <input
              value={agentUid}
              onChange={(e) => {
                setAgentUid(e.target.value.toUpperCase());
                setFormError('');
              }}
              className={INPUT}
              placeholder="Enter Agent UID"
            />
          </label>

          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Generating...' : 'Generate OTP'}
          </button>
        </form>

        {generatedOtp ? (
          <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 p-5 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Your Withdraw OTP
            </p>
            <p className="mt-3 text-4xl font-bold tracking-[0.4em] text-emerald-800">{generatedOtp}</p>
            <p className="mt-3 text-sm text-emerald-700">
              এজেন্টকে এই OTP দিন। ১৫ মিনিট valid।
            </p>
            <button
              type="button"
              onClick={handleCopyOtp}
              className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"
            >
              {copied ? 'Copied!' : 'Copy OTP'}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}

export default function WithdrawPage() {
  const navigate = useNavigate();
  const { user, loggedIn, refreshBalance } = useAuth();
  const { currencySymbol } = useSiteBranding();
  const [activeTab, setActiveTab] = useState('agent');
  const [profile, setProfile] = useState(null);
  const [rules, setRules] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await fetchPlayerAgentWithdrawRequests();
      setRequests(data.requests || []);
    } catch {
      setRequests([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile().then(setProfile).catch(() => {});
    fetchPublicDepositWithdrawRules()
      .then(setRules)
      .catch(() => setRules(null));
    loadHistory();
    refreshBalance();
  }, [loadHistory, refreshBalance]);

  const turnoverIncomplete =
    rules?.requireTurnoverForWithdraw !== false
    && profile?.wallet
    && !profile.wallet.turnoverComplete;
  const balance = user?.balance ?? profile?.balance ?? 0;
  const withdrawChannel = profile?.withdrawChannel || null;
  const showNoDeposit = !withdrawChannel;
  const showGateway = withdrawChannel === 'PAYMENT';
  const showAgent = withdrawChannel === 'AGENT';

  useEffect(() => {
    if (withdrawChannel === 'PAYMENT') {
      setActiveTab('gateway');
    } else if (withdrawChannel === 'AGENT') {
      setActiveTab('agent');
    }
  }, [withdrawChannel]);

  return (
    <div className="min-h-screen pb-[82px] lg:pb-0" style={{ backgroundColor: colors.mainBg }}>
      <Header onProfileClick={() => navigate('/profile')} onMenuClick={() => navigate('/')} />

      <div className="mx-auto w-full max-w-lg px-3 py-4 lg:py-6">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <p className="text-sm font-semibold text-slate-900">
              Balance {formatMoney(balance, currencySymbol)}
            </p>
          </div>

          <div className="border-b border-slate-100 p-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => showGateway && setActiveTab('gateway')}
                disabled={!showGateway}
                className={`${TAB_BUTTON} ${
                  !showGateway
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-60'
                    : activeTab === 'gateway'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Building2 size={16} />
                Payment Gateway
              </button>
              <button
                type="button"
                onClick={() => showAgent && setActiveTab('agent')}
                disabled={!showAgent}
                className={`${TAB_BUTTON} ${
                  !showAgent
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-60'
                    : activeTab === 'agent'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <KeyRound size={16} />
                Agent (OTP)
              </button>
            </div>
          </div>

          <div className="p-4">
            {showNoDeposit ? (
              <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                প্রথমে একটি Successful Deposit করুন।
              </div>
            ) : activeTab === 'gateway' && showGateway ? (
              <PaymentGatewayWithdrawTab
                currencySymbol={currencySymbol}
                rules={rules}
                turnoverIncomplete={turnoverIncomplete}
              />
            ) : showAgent ? (
              <AgentWithdrawTab
                currencySymbol={currencySymbol}
                rules={rules}
                turnoverIncomplete={turnoverIncomplete}
                onGenerated={() => loadHistory()}
              />
            ) : null}
          </div>

          {activeTab === 'agent' && showAgent ? (
            <div className="border-t border-slate-100 p-4">
              <h3 className="text-sm font-bold text-slate-900">My Withdraw OTPs</h3>
              {loadingHistory ? (
                <p className="mt-3 text-sm text-slate-400">Loading...</p>
              ) : requests.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">No requests yet</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {requests.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {formatMoney(item.amount, currencySymbol)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Agent: {item.agentUid} · {formatDateTime(item.createdAt)}
                          </p>
                          {item.status === 'pending' && item.otp ? (
                            <p className="mt-2 text-2xl font-bold tracking-[0.35em] text-emerald-700">
                              OTP: {item.otp}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(item.status)}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {loggedIn ? <PlayerMobileNav /> : null}
    </div>
  );
}
