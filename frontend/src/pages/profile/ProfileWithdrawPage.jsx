import { useEffect, useState } from 'react';
import AuthToast from '../../components/AuthToast';
import ProfilePageShell from '../../components/profile/ProfilePageShell';
import {
  confirmUserWithdraw,
  fetchUserProfile,
  requestUserWithdrawOtp,
} from '../../services/userProfileService';
import { fetchPublicDepositWithdrawRules } from '../../services/adminGeneralSettingsService';
import { useSiteBranding } from '../../context/SiteBrandingContext';

const INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-violet-500';

export default function ProfileWithdrawPage() {
  const { currencySymbol } = useSiteBranding();
  const [profile, setProfile] = useState(null);
  const [amount, setAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [method, setMethod] = useState('bkash');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('form');
  const [demoOtp, setDemoOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [rules, setRules] = useState(null);

  useEffect(() => {
    fetchUserProfile().then(setProfile).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    fetchPublicDepositWithdrawRules()
      .then((data) => {
        if (active) setRules(data);
      })
      .catch(() => {
        if (active) setRules(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const turnoverIncomplete =
    rules?.requireTurnoverForWithdraw !== false
    && profile?.wallet
    && !profile.wallet.turnoverComplete;
  const withdrawChannel = profile?.withdrawChannel || null;

  const handleRequestOtp = async (event) => {
    event.preventDefault();
    if (turnoverIncomplete) return;
    setSubmitting(true);
    try {
      const result = await requestUserWithdrawOtp(Number(amount));
      setDemoOtp(result.demoOtp || '');
      setStep('otp');
      setToast('OTP sent to your phone');
    } catch (error) {
      setToast(error.message || 'Failed to send OTP');
    } finally {
      setSubmitting(false);
      window.setTimeout(() => setToast(''), 3000);
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
      setToast('Withdraw request submitted');
      setStep('form');
      setOtp('');
      setAmount('');
      setAccountNumber('');
    } catch (error) {
      setToast(error.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
      window.setTimeout(() => setToast(''), 3000);
    }
  };

  return (
    <ProfilePageShell title="Withdraw">
      <AuthToast message={toast} />
      {!withdrawChannel ? (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
          প্রথমে একটি Successful Deposit করুন।
        </div>
      ) : withdrawChannel === 'AGENT' ? (
        <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
          আপনি Agent এর মাধ্যমে Deposit করেছেন, তাই শুধুমাত্র Agent এর মাধ্যমেই Withdraw করতে পারবেন।
          Withdraw পেজের Agent (OTP) ট্যাব ব্যবহার করুন।
        </div>
      ) : null}
      {withdrawChannel === 'PAYMENT' && turnoverIncomplete ? (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600">
          Turnover incomplete. Complete turnover before withdrawing.
        </div>
      ) : null}

      {withdrawChannel === 'PAYMENT' && step === 'form' ? (
        <form onSubmit={handleRequestOtp} className="mt-4 space-y-4 rounded-2xl bg-white p-4 shadow-sm">
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
            disabled={submitting || turnoverIncomplete}
            className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Sending OTP...' : 'Next — Send OTP'}
          </button>
        </form>
      ) : withdrawChannel === 'PAYMENT' && step === 'otp' ? (
        <form onSubmit={handleConfirmWithdraw} className="mt-4 space-y-4 rounded-2xl bg-white p-4 shadow-sm">
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
            className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
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
      ) : null}
    </ProfilePageShell>
  );
}
