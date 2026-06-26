import { useState } from 'react';
import { authColors } from '../config/authTheme';
import { uiConfig } from '../config/uiConfig';
import { loginUser, setSession } from '../utils/auth';
import { setRefreshToken, setUserToken } from '../utils/userAuth';
import { requestLoginOtp, verifyLoginOtp } from '../services/authOtpService';
import AuthField from './AuthField';

export default function LoginPage({ onForgotPassword, onLoginSuccess }) {
  const [mode, setMode] = useState('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const result = await loginUser({ username, password });
    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onLoginSuccess?.(result.user, result.token, result.refreshToken);
  };

  const handleRequestOtp = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await requestLoginOtp(username.trim());
      setDemoOtp(result.demoOtp || '');
      setOtpSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpLogin = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await verifyLoginOtp(username.trim(), otp.trim());
      const apiUser = {
        id: String(result.user.id),
        dbId: result.user.id,
        username: result.user.username || result.user.name,
        name: result.user.name,
        phone: result.user.phone,
        providerUsername: result.user.providerUsername,
        balance: result.user.balance,
        referralCode: result.user.referralCode,
        currency: 'BDT',
      };
      setUserToken(result.token);
      if (result.refreshToken) setRefreshToken(result.refreshToken);
      setSession(apiUser, result.token);
      onLoginSuccess?.(apiUser, result.token, result.refreshToken);
    } catch (err) {
      setError(err.message || 'OTP login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ paddingTop: uiConfig.spacing }}>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode('password');
            setError('');
            setOtpSent(false);
          }}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold"
          style={{
            backgroundColor: mode === 'password' ? 'rgba(24, 201, 110, 0.15)' : 'transparent',
            color: mode === 'password' ? authColors.green : authColors.gray,
          }}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('otp');
            setError('');
          }}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold"
          style={{
            backgroundColor: mode === 'otp' ? 'rgba(24, 201, 110, 0.15)' : 'transparent',
            color: mode === 'otp' ? authColors.green : authColors.gray,
          }}
        >
          OTP Login
        </button>
      </div>

      {mode === 'password' ? (
        <form className="space-y-4" onSubmit={handlePasswordLogin}>
          <AuthField
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />

          <div>
            <AuthField
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm font-medium transition-opacity duration-200 hover:opacity-80"
                style={{ color: authColors.green }}
              >
                Forgot password?
              </button>
            </div>
          </div>

          {error ? (
            <p
              className="rounded-md border px-3 py-2 text-sm"
              style={{
                color: '#fca5a5',
                backgroundColor: 'rgba(127, 29, 29, 0.25)',
                borderColor: 'rgba(248, 113, 113, 0.35)',
              }}
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="relative mt-2 w-full text-sm font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
            style={{
              height: uiConfig.buttonHeight,
              borderRadius: uiConfig.radius,
              backgroundColor: authColors.green,
              color: authColors.text,
              boxShadow: '0 8px 24px rgba(24, 201, 110, 0.28)',
            }}
          >
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={otpSent ? handleOtpLogin : handleRequestOtp}>
          <AuthField
            label="Username / Phone"
            placeholder="Enter username or phone"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />

          {otpSent ? (
            <>
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
                </div>
              ) : null}
              <AuthField
                label="OTP"
                placeholder="6 digit OTP"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </>
          ) : null}

          {error ? (
            <p
              className="rounded-md border px-3 py-2 text-sm"
              style={{
                color: '#fca5a5',
                backgroundColor: 'rgba(127, 29, 29, 0.25)',
                borderColor: 'rgba(248, 113, 113, 0.35)',
              }}
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="relative mt-2 w-full text-sm font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
            style={{
              height: uiConfig.buttonHeight,
              borderRadius: uiConfig.radius,
              backgroundColor: authColors.green,
              color: authColors.text,
              boxShadow: '0 8px 24px rgba(24, 201, 110, 0.28)',
            }}
          >
            {submitting ? 'Please wait...' : otpSent ? 'Verify & Log in' : 'Send Login OTP'}
          </button>
        </form>
      )}
    </div>
  );
}
