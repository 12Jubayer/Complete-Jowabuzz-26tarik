import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AdminToast from '../../components/admin/AdminToast';
import AffiliateAuthShell from '../../components/affiliate/landing/AffiliateAuthShell';
import {
  AFFILIATE_BUTTON_CLASS,
  AFFILIATE_INPUT_CLASS,
  AFFILIATE_LABEL_CLASS,
  AFFILIATE_LINK_CLASS,
} from '../../components/affiliate/landing/authStyles';
import { useAffiliateAuth } from '../../context/AffiliateAuthContext';
import { loginAffiliate } from '../../services/affiliateAuthService';

export default function AffiliateLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticated, login } = useAffiliateAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Affiliate Login | JowaBuzz';
    let viewport = document.querySelector('meta[name="viewport"]');
    if (viewport && !viewport.content.includes('viewport-fit')) {
      viewport.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
    }
  }, []);

  useEffect(() => {
    if (location.state?.message) {
      setToast(location.state.message);
      setToastType('success');
      window.setTimeout(() => setToast(''), 5000);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  if (authenticated) {
    return <Navigate to="/affiliate/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setToast('');
    setLoading(true);

    const result = await loginAffiliate({ identifier, password });

    if (!result.success) {
      setToastType('error');
      setToast(result.error);
      setLoading(false);
      window.setTimeout(() => setToast(''), 4000);
      return;
    }

    login(result.affiliate);
    navigate('/affiliate/dashboard', { replace: true });
  };

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <AffiliateAuthShell
        title="Affiliate Login"
        subtitle="আপনার Affiliate Dashboard-এ প্রবেশ করুন"
        footer={
          <p className="text-sm text-[#94A3B8]">
            Account নেই?{' '}
            <Link to="/affiliate/signup" className={AFFILIATE_LINK_CLASS}>
              Sign Up
            </Link>
          </p>
        }
      >
        <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className={AFFILIATE_LABEL_CLASS}>Username or Phone</span>
            <input
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Username / phone"
              className={AFFILIATE_INPUT_CLASS}
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className={AFFILIATE_LABEL_CLASS}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              className={AFFILIATE_INPUT_CLASS}
              autoComplete="current-password"
            />
          </label>

          <button type="submit" disabled={loading} className={AFFILIATE_BUTTON_CLASS}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </AffiliateAuthShell>
    </>
  );
}
