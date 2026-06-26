import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AdminToast from '../../components/admin/AdminToast';
import { useAgentAuth } from '../../context/AgentAuthContext';
import { loginAgent } from '../../services/agentAuthService';
import { registerMoveCashServiceWorker } from '../../services/movecashService';
import {
  canAccessPrivateAgent,
  getMainSiteFallbackPath,
  JBCASH_LOGO_SRC,
  markJBCashAppSession,
} from '../../utils/agentAppRoutes';

const AGENT_GREEN = '#22c55e';
const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-green-500 focus:ring-1 focus:ring-green-500';

function setPrivatePageMeta() {
  document.title = 'JBCash';
  let robots = document.querySelector('meta[name="robots"][data-agent-private="1"]');
  if (!robots) {
    robots = document.createElement('meta');
    robots.name = 'robots';
    robots.setAttribute('data-agent-private', '1');
    document.head.appendChild(robots);
  }
  robots.content = 'noindex, nofollow';

  let theme = document.querySelector('meta[name="theme-color"][data-movecash="1"]');
  if (!theme) {
    theme = document.createElement('meta');
    theme.name = 'theme-color';
    theme.setAttribute('data-movecash', '1');
    document.head.appendChild(theme);
  }
  theme.content = '#F8F9FA';
}

export default function AgentLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticated, login } = useAgentAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState('');
  const allowed = canAccessPrivateAgent(location.search);

  useEffect(() => {
    if (!allowed) return;
    markJBCashAppSession();
    setPrivatePageMeta();
    registerMoveCashServiceWorker();
  }, [allowed]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlHeight = html.style.height;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyBg = body.style.backgroundColor;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyMinHeight = body.style.minHeight;

    html.style.height = '100%';
    html.style.overflow = 'hidden';
    body.style.backgroundColor = '#ffffff';
    body.style.overflow = 'hidden';
    body.style.minHeight = '100%';

    return () => {
      html.style.height = prevHtmlHeight;
      html.style.overflow = prevHtmlOverflow;
      body.style.backgroundColor = prevBodyBg;
      body.style.overflow = prevBodyOverflow;
      body.style.minHeight = prevBodyMinHeight;
    };
  }, []);

  if (!allowed) {
    return <Navigate to={getMainSiteFallbackPath()} replace />;
  }

  if (authenticated) {
    return <Navigate to="/agent/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setToast('');

    const result = await loginAgent({ loginId, password });

    if (!result.success) {
      setToast(result.error);
      window.setTimeout(() => setToast(''), 3500);
      return;
    }

    login(result.agent);
    markJBCashAppSession();
    navigate('/agent/dashboard', { replace: true });
  };

  return (
    <>
      <AdminToast message={toast} />

      <div
        className="fixed inset-0 z-10 flex h-[100dvh] w-full flex-col overflow-hidden bg-white"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div
          className="w-full shrink-0 px-6 py-10 text-center"
          style={{ background: '#000000' }}
        >
          <div className="mx-auto mb-4 flex justify-center">
            <img
              src={JBCASH_LOGO_SRC}
              alt="JBCash"
              className="h-20 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">JBCash</h1>
          <p className="mt-2 text-sm text-white/90">Sign in to your agent account</p>
        </div>

        <form
          className="flex min-h-0 w-full flex-1 flex-col bg-white px-6 py-6"
          onSubmit={handleSubmit}
        >
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">
                User ID
              </span>
              <input
                type="text"
                value={loginId}
                onChange={(event) => setLoginId(event.target.value)}
                placeholder="Agent UID, name or ID"
                className={INPUT_CLASS}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                className={INPUT_CLASS}
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-lg py-3 text-sm font-bold text-white transition-all hover:brightness-110"
              style={{ backgroundColor: AGENT_GREEN }}
            >
              Sign In
            </button>
          </div>

          <p className="mt-auto pt-6 text-center text-sm leading-relaxed text-gray-500">
            শুধুমাত্র অনুমোদিত এজেন্টদের জন্য। অ্যাকাউন্ট পেতে অ্যাডমিনের সাথে যোগাযোগ করুন।
          </p>
        </form>
      </div>
    </>
  );
}
