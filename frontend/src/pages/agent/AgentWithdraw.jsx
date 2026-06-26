import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminToast from '../../components/admin/AdminToast';
import { fetchAgentDashboard } from '../../services/agentDashboardService';
import { confirmWithdraw, requestWithdrawOtp } from '../../services/agentWithdrawService';

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

function formatAmount(value) {
  const num = Number(value || 0);
  return Number.isInteger(num) ? num.toLocaleString('en-BD') : num.toLocaleString('en-BD');
}

function StepIndicator({ step }) {
  const amountDone = step === 2;

  return (
    <div className="mb-6 flex items-center justify-center gap-3">
      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white ${
            amountDone ? 'bg-emerald-500' : 'bg-blue-500'
          }`}
        >
          {amountDone ? <Check size={16} strokeWidth={3} /> : 'A'}
        </div>
        <span className={`text-sm font-medium ${amountDone ? 'text-slate-500' : 'text-slate-900'}`}>
          Amount
        </span>
      </div>

      <div className="h-px w-10 bg-slate-200" />

      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
            step === 2 ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'
          }`}
        >
          O
        </div>
        <span className={`text-sm font-medium ${step === 2 ? 'text-slate-900' : 'text-slate-400'}`}>
          OTP
        </span>
      </div>
    </div>
  );
}

export default function AgentWithdraw() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [otp, setOtp] = useState('');
  const [agentUid, setAgentUid] = useState('');
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');

  const showToast = (message, type = 'error') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  };

  const loadAgent = useCallback(async () => {
    setLoading(true);

    try {
      const data = await fetchAgentDashboard();
      setAgentUid(data.uid || '');
      setBalance(Number(data.balance || 0));
    } catch (err) {
      showToast(err.message || 'Failed to load agent data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgent();
  }, [loadAgent]);

  const numericAmount = Number(amount);
  const displayAmount = amount === '' ? 0 : numericAmount;

  const handleAmountNext = async (event) => {
    event.preventDefault();
    setError('');

    if (!amount || numericAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    if (numericAmount > balance) {
      setError('Insufficient balance');
      showToast('Insufficient balance');
      return;
    }

    setSubmitting(true);

    try {
      await requestWithdrawOtp(numericAmount);
      showToast('OTP sent successfully', 'success');
      setStep(2);
      setOtp('');
    } catch (err) {
      const message = err.message || 'Failed to send OTP';
      setError(message);
      if (message.toLowerCase().includes('insufficient')) {
        showToast('Insufficient balance');
      } else {
        showToast(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (event) => {
    event.preventDefault();
    setError('');

    const trimmedOtp = otp.trim();

    if (!/^\d{6}$/.test(trimmedOtp)) {
      setError('Enter the 6-digit OTP');
      return;
    }

    setSubmitting(true);

    try {
      await confirmWithdraw(numericAmount, trimmedOtp);
      showToast('Withdraw successful', 'success');
      window.setTimeout(() => {
        navigate('/agent/dashboard', { replace: true });
      }, 800);
    } catch (err) {
      const message = err.message || 'Withdraw failed';

      if (message.toLowerCase().includes('invalid otp')) {
        showToast('Invalid OTP');
      } else if (message.toLowerCase().includes('insufficient')) {
        showToast('Insufficient balance');
      } else {
        showToast(message);
      }

      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-md animate-pulse rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="h-6 w-40 rounded bg-slate-200" />
        <div className="mt-6 h-10 rounded bg-slate-200" />
        <div className="mt-4 h-12 rounded bg-slate-200" />
      </div>
    );
  }

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => (step === 2 ? setStep(1) : navigate('/agent/dashboard'))}
              className="rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-slate-100"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-slate-900">Withdraw via OTP</h1>
          </div>

          <StepIndicator step={step} />

          {step === 1 ? (
            <form onSubmit={handleAmountNext} className="space-y-4">
              <div>
                <label htmlFor="withdraw-amount" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Amount (৳)
                </label>
                <input
                  id="withdraw-amount"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setError('');
                  }}
                  className={INPUT_CLASS}
                  placeholder="0"
                  disabled={submitting}
                />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Sending OTP...' : 'Next'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleConfirm} className="space-y-4">
              <div>
                <label htmlFor="withdraw-otp" className="mb-1.5 block text-sm font-medium text-slate-700">
                  OTP (6 digits)
                </label>
                <input
                  id="withdraw-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => {
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));
                    setError('');
                  }}
                  className={`${INPUT_CLASS} tracking-[0.35em] text-center`}
                  placeholder="- - - - - -"
                  disabled={submitting}
                  autoComplete="one-time-code"
                />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Processing...' : 'Confirm Cash Out'}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-xs text-slate-400">
            Amount: ৳{formatAmount(displayAmount)} · Agent UID: {agentUid || '—'}
          </p>
        </div>
      </div>
    </>
  );
}
