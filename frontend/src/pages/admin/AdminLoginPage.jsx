import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { loginAdmin } from '../../services/adminAuthService';

const ADMIN_GREEN = '#22c55e';
const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-green-500 focus:ring-1 focus:ring-green-500';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { authenticated, login } = useAdminAuth();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (authenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const result = await loginAdmin({ email, password });

    if (!result.success) {
      setError(result.error);
      return;
    }

    login(result.user);
    navigate('/admin/dashboard', { replace: true });
  };

  return (
    <div
      className="admin-panel admin-login-page flex min-h-screen items-center justify-center px-4 py-10 text-slate-900"
      style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)',
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div
          className="px-6 py-8 text-center"
          style={{ backgroundColor: ADMIN_GREEN }}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3L4 7V12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12V7L12 3Z"
                stroke="white"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M9 12L11 14L15 10"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Login</h1>
          <p className="mt-2 text-sm text-white/90">
            Sign in to access the admin panel
          </p>
        </div>

        <form className="space-y-5 px-6 py-6" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              className={INPUT_CLASS}
            />          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              className={INPUT_CLASS}
            />          </label>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg py-3 text-sm font-bold text-white transition-all hover:brightness-110"
            style={{ backgroundColor: ADMIN_GREEN }}
          >
            Sign In
          </button>

          <p className="text-center text-sm text-gray-500">
            Demo: admin@example.com / admin123
          </p>

          <p className="text-center text-sm text-gray-500">
            শুধুমাত্র অনুমোদিত অ্যাডমিনদের জন্য।
          </p>

          <div className="text-center">
            <Link
              to="/"
              className="text-sm font-medium transition-opacity hover:opacity-80"
              style={{ color: ADMIN_GREEN }}
            >
              ← Back to home
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
