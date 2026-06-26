import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { authColors } from '../config/authTheme';
import { uiConfig } from '../config/uiConfig';
import {
  requestForgotPasswordOtp,
  resetPasswordWithOtp,
} from '../services/authOtpService';
import AuthField from './AuthField';

const stepMotion = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.25, ease: 'easeOut' },
};

function ErrorBox({ message }) {
  if (!message) return null;

  return (
    <p
      className="rounded-md border px-3 py-2 text-sm"
      style={{
        color: '#fca5a5',
        backgroundColor: 'rgba(127, 29, 29, 0.25)',
        borderColor: 'rgba(248, 113, 113, 0.35)',
      }}
    >
      {message}
    </p>
  );
}

function PrimaryButton({ children, type = 'button', onClick, disabled = false }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full text-sm font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        height: uiConfig.buttonHeight,
        borderRadius: uiConfig.radius,
        backgroundColor: authColors.green,
        color: authColors.text,
        boxShadow: disabled ? 'none' : '0 8px 24px rgba(24, 201, 110, 0.28)',
      }}
    >
      {children}
    </button>
  );
}

export default function ForgotPassword({ onBackToLogin, onSuccess }) {
  const [step, setStep] = useState('identifier');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;

    const timer = window.setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const sendOtp = async () => {
    setSubmitting(true);
    try {
      const result = await requestForgotPasswordOtp(identifier.trim());
      setMaskedPhone(result.maskedPhone || 'your phone');
      setDemoOtp(result.demoOtp || '');
      setResendCooldown(60);
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setError('');
    await sendOtp();
  };

  const handleResendOtp = async () => {
    setError('');
    setOtp('');
    await sendOtp();
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(otp.trim())) {
      setError('OTP must be 6 digits');
      return;
    }

    setStep('password');
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await resetPasswordWithOtp({
        identifier: identifier.trim(),
        otp: otp.trim(),
        newPassword,
        confirmPassword,
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ paddingTop: uiConfig.spacing }}>
      <div className="mb-4">
        <h2 className="text-lg font-bold" style={{ color: authColors.text }}>
          Forgot Password
        </h2>
        <p className="mt-1 text-sm" style={{ color: authColors.gray }}>
          {step === 'identifier' && 'Enter your username or phone number to receive OTP.'}
          {step === 'otp' && `OTP sent to ${maskedPhone}`}
          {step === 'password' && 'OTP verified. Set your new password.'}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === 'identifier' && (
          <motion.form key="identifier" {...stepMotion} className="space-y-4" onSubmit={handleSendOtp}>
            <AuthField
              label="Phone number / Username"
              placeholder="Enter username or phone number"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />

            <ErrorBox message={error} />
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? 'Sending OTP...' : 'Send OTP'}
            </PrimaryButton>
          </motion.form>
        )}

        {step === 'otp' && (
          <motion.form key="otp" {...stepMotion} className="space-y-4" onSubmit={handleVerifyOtp}>
            {demoOtp ? (
              <div
                className="rounded-md border px-3 py-2 text-sm"
                style={{
                  backgroundColor: 'rgba(24, 201, 110, 0.08)',
                  borderColor: authColors.green,
                  color: authColors.text,
                }}
              >
                Demo OTP: <strong>{demoOtp}</strong>
                <span className="mt-1 block text-xs" style={{ color: authColors.gray }}>
                  Demo mode — OTP shown here instead of real SMS.
                </span>
              </div>
            ) : null}

            <AuthField
              label="Enter OTP"
              placeholder="6 digit OTP"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />

            <ErrorBox message={error} />
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? 'Verifying...' : 'Verify OTP'}
            </PrimaryButton>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || submitting}
                className="text-sm font-medium transition-opacity duration-200 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ color: authColors.green }}
              >
                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </motion.form>
        )}

        {step === 'password' && (
          <motion.form key="password" {...stepMotion} className="space-y-4" onSubmit={handleResetPassword}>
            <AuthField
              label="New Password"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />

            <AuthField
              label="Confirm New Password"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />

            <ErrorBox message={error} />
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? 'Resetting...' : 'Reset Password'}
            </PrimaryButton>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-sm font-medium transition-opacity duration-200 hover:opacity-80"
          style={{ color: authColors.green }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
