import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authColors } from '../config/authTheme';
import { uiConfig } from '../config/uiConfig';
import { registerUser } from '../utils/auth';
import AuthField from './AuthField';

export default function SignupPage({ onSignupSuccess }) {
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [referCode, setReferCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showReferCode, setShowReferCode] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferCode(ref.toUpperCase());
      setShowReferCode(true);
    }
  }, [searchParams]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!acceptedTerms) {
      setError('Please accept the Terms & Conditions');
      return;
    }

    const result = await registerUser({
      username,
      phone,
      password,
      confirmPassword,
      currency: 'BDT',
      referCode,
    });

    if (!result.success) {
      setError(result.error);
      return;
    }

    onSignupSuccess?.(result.user);
  };

  return (
    <form
      className="space-y-4"
      style={{ paddingTop: uiConfig.spacing }}
      onSubmit={handleSubmit}
    >
      <AuthField
        label="Username"
        placeholder="Enter your username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />

      <label className="block">
        <span
          className="mb-2 block text-sm"
          style={{ color: authColors.gray }}
        >
          Choose currency
        </span>
        <div
          className="flex items-center justify-between px-3 text-sm"
          style={{
            height: uiConfig.inputHeight,
            borderRadius: uiConfig.radius,
            backgroundColor: authColors.input,
            border: `1px solid ${authColors.border}`,
            color: authColors.text,
          }}
        >
          <div className="flex items-center gap-2">
            <img
              src="/images/flag-bd.svg"
              alt="Bangladesh"
              className="h-5 w-5 rounded-full object-cover"
            />
            <span>BDT</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9L12 15L18 9"
              stroke={authColors.gray}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </label>

      <div>
        <span
          className="mb-2 block text-sm"
          style={{ color: authColors.gray }}
        >
          Phone number
        </span>
        <div className="flex gap-2">
          <div
            className="flex shrink-0 items-center gap-1.5 px-2.5 text-sm"
            style={{
              height: uiConfig.inputHeight,
              borderRadius: uiConfig.radius,
              backgroundColor: authColors.input,
              border: `1px solid ${authColors.border}`,
              color: authColors.text,
            }}
          >
            <img
              src="/images/flag-bd.svg"
              alt="Bangladesh"
              className="h-4 w-4 rounded-full object-cover"
            />
            <span>+880</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 9L12 15L18 9"
                stroke={authColors.gray}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="--- --- ---"
            className="min-w-0 flex-1 px-3 text-sm outline-none transition-all duration-200"
            style={{
              height: uiConfig.inputHeight,
              borderRadius: uiConfig.radius,
              backgroundColor: authColors.input,
              border: `1px solid ${authColors.border}`,
              color: authColors.text,
            }}
          />
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowReferCode((prev) => !prev)}
          className="mb-2 flex items-center gap-1 text-sm"
          style={{ color: authColors.gray }}
        >
          Refer code (Optional)
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            className={`transition-transform duration-200 ${showReferCode ? 'rotate-180' : ''}`}
          >
            <path
              d="M6 9L12 15L18 9"
              stroke={authColors.gray}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {showReferCode && (
          <input
            type="text"
            value={referCode}
            onChange={(event) => setReferCode(event.target.value)}
            placeholder="Please enter the refer code"
            className="w-full px-3 text-sm outline-none"
            style={{
              height: uiConfig.inputHeight,
              borderRadius: uiConfig.radius,
              backgroundColor: authColors.input,
              border: `1px solid ${authColors.border}`,
              color: authColors.text,
            }}
          />
        )}
      </div>

      <AuthField
        label="Password"
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <AuthField
        label="Confirm Password"
        type="password"
        placeholder="Confirm your password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />

      {error && (
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
      )}

      <label className="flex items-start gap-3 pt-1">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border transition-colors duration-200"
          style={{
            backgroundColor: acceptedTerms ? authColors.green : authColors.input,
            borderColor: acceptedTerms ? authColors.green : authColors.border,
            backgroundImage: acceptedTerms
              ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='white'%3E%3Cpath d='M12.2 4.7 6.8 10.1 3.8 7.1l-1.1 1.1 4.1 4.1 6.5-6.5z'/%3E%3C/svg%3E\")"
              : 'none',
            backgroundSize: '12px',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        />
        <span className="text-xs leading-relaxed" style={{ color: authColors.gray }}>
          I confirm that I am 18 years old and I have read the{' '}
          <button type="button" className="underline" style={{ color: authColors.gray }}>
            Terms &amp; Conditions
          </button>
        </span>
      </label>

      <button
        type="submit"
        className="relative mt-2 w-full text-sm font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.99]"
        style={{
          height: uiConfig.buttonHeight,
          borderRadius: uiConfig.radius,
          backgroundColor: authColors.green,
          color: authColors.text,
          boxShadow: '0 8px 24px rgba(24, 201, 110, 0.28)',
        }}
      >
        Continue
        <span
          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold"
          style={{
            backgroundColor: authColors.background,
            color: authColors.text,
            border: `1px solid ${authColors.border}`,
          }}
        >
          JB
        </span>
      </button>
    </form>
  );
}
