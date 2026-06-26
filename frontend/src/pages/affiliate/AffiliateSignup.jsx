import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import AdminToast from '../../components/admin/AdminToast';
import AffiliateAuthShell from '../../components/affiliate/landing/AffiliateAuthShell';
import {
  AFFILIATE_BUTTON_CLASS,
  AFFILIATE_INPUT_CLASS,
  AFFILIATE_LABEL_CLASS,
  AFFILIATE_LINK_CLASS,
} from '../../components/affiliate/landing/authStyles';
import { useAffiliateAuth } from '../../context/AffiliateAuthContext';
import { registerAffiliate } from '../../services/affiliateAuthService';

export default function AffiliateSignup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authenticated } = useAffiliateAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [settlementUserId, setSettlementUserId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [refCode, setRefCode] = useState(() => searchParams.get('ref') || '');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Affiliate Registration | JowaBuzz';
    let viewport = document.querySelector('meta[name="viewport"]');
    if (viewport && !viewport.content.includes('viewport-fit')) {
      viewport.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
    }
  }, []);

  if (authenticated) {
    return <Navigate to="/affiliate/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setToast('');

    if (password !== confirmPassword) {
      setToast('Passwords do not match');
      window.setTimeout(() => setToast(''), 4000);
      return;
    }

    setLoading(true);

    const result = await registerAffiliate({
      name,
      phone,
      email: email.trim() || undefined,
      password,
      settlementUserId: settlementUserId.trim(),
      ref: refCode.trim() || undefined,
    });

    if (!result.success) {
      setToast(result.error);
      setLoading(false);
      window.setTimeout(() => setToast(''), 4000);
      return;
    }

    navigate('/affiliate/login', {
      replace: true,
      state: {
        message:
          result.message ||
          'Signup successful. Please wait for admin approval. You will receive an email when approved.',
      },
    });
  };

  return (
    <>
      <AdminToast message={toast} />

      <AffiliateAuthShell
        title="Affiliate Registration"
        subtitle="Affiliate Program-এ যোগ দিন এবং Admin Approval-এর পর Dashboard Access পান"
        footer={
          <p className="text-sm text-[#94A3B8]">
            আগেই Account আছে?{' '}
            <Link to="/affiliate/login" className={AFFILIATE_LINK_CLASS}>
              Login
            </Link>
          </p>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className={AFFILIATE_LABEL_CLASS}>Full Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              className={AFFILIATE_INPUT_CLASS}
              required
            />
          </label>

          <label className="block">
            <span className={AFFILIATE_LABEL_CLASS}>Phone Number</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="01XXXXXXXXX"
              className={AFFILIATE_INPUT_CLASS}
              required
            />
          </label>

          <label className="block">
            <span className={AFFILIATE_LABEL_CLASS}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@example.com"
              className={AFFILIATE_INPUT_CLASS}
              required
            />
          </label>

          <label className="block">
            <span className={AFFILIATE_LABEL_CLASS}>Settlement Option (User ID)</span>
            <input
              type="text"
              inputMode="numeric"
              value={settlementUserId}
              onChange={(event) => setSettlementUserId(event.target.value.replace(/\D/g, ''))}
              placeholder="Enter active player User ID for settlement"
              className={AFFILIATE_INPUT_CLASS}
              required
            />
            <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">
              Active player account-এর User ID দিলে Affiliate settlement/commission টাকা ওই player wallet/balance-এ যাবে।
            </p>
          </label>

          <label className="block">
            <span className={AFFILIATE_LABEL_CLASS}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              className={AFFILIATE_INPUT_CLASS}
              minLength={6}
              required
            />
          </label>

          <label className="block">
            <span className={AFFILIATE_LABEL_CLASS}>Confirm Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter password"
              className={AFFILIATE_INPUT_CLASS}
              minLength={6}
              required
            />
          </label>

          <label className="block">
            <span className={AFFILIATE_LABEL_CLASS}>
              Referral Code{' '}
              <span className="font-normal text-[#94A3B8]">(optional)</span>
            </span>
            <input
              type="text"
              value={refCode}
              onChange={(event) => setRefCode(event.target.value.toUpperCase())}
              placeholder="AFF12345"
              className={AFFILIATE_INPUT_CLASS}
            />
          </label>

          <button type="submit" disabled={loading} className={AFFILIATE_BUTTON_CLASS}>
            {loading ? 'Creating account...' : 'Create Affiliate Account'}
          </button>
        </form>
      </AffiliateAuthShell>
    </>
  );
}
