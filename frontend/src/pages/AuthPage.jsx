import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AuthHeader from '../components/AuthHeader';
import AuthTabs from '../components/AuthTabs';
import AuthToast from '../components/AuthToast';
import ForgotPassword from '../components/ForgotPassword';
import HeroAnimation from '../components/HeroAnimation';
import LoginPage from '../components/LoginPage';
import SignupPage from '../components/SignupPage';
import { authColors } from '../config/authTheme';
import { uiConfig } from '../config/uiConfig';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loggedIn } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [authView, setAuthView] = useState('login');
  const [toastMessage, setToastMessage] = useState('');

  const activeTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';
  const redirectPath = location.state?.from || '/';

  useEffect(() => {
    if (loggedIn) {
      navigate(redirectPath, { replace: true });
    }
  }, [loggedIn, navigate, redirectPath]);

  useEffect(() => {
    if (authView !== 'forgot') {
      setAuthView(activeTab);
    }
  }, [activeTab, authView]);

  const handleTabChange = (tab) => {
    setAuthView(tab);
    setSearchParams({ tab });
  };

  const showToast = (message) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 3000);
  };

  const goToLogin = () => {
    setAuthView('login');
    setSearchParams({ tab: 'login' });
  };

  const handleAuthSuccess = (user, token, refreshToken, message) => {
    login(user, token, refreshToken);
    if (message) showToast(message);
    navigate(redirectPath, { replace: true });
  };

  const handleResetSuccess = () => {
    showToast('Password reset successful');
    goToLogin();
  };

  return (
    <div
      className="min-h-screen md:flex md:items-start md:justify-center md:py-6"
      style={{
        backgroundColor: authColors.background,
        paddingTop: uiConfig.headerHeight,
      }}
    >
      <AuthHeader />
      <AuthToast message={toastMessage} />

      <div
        className="mx-auto w-full max-w-md md:overflow-hidden md:rounded-2xl md:border md:shadow-2xl"
        style={{
          backgroundColor: authColors.background,
          borderColor: authColors.border,
        }}
      >
        <HeroAnimation />

        {authView !== 'forgot' && (
          <AuthTabs activeTab={activeTab} onChange={handleTabChange} />
        )}

        <div
          style={{
            paddingInline: uiConfig.spacing,
            paddingBottom: uiConfig.spacing * 2,
          }}
        >
          <AnimatePresence mode="wait">
            {authView === 'forgot' ? (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <ForgotPassword
                  onBackToLogin={goToLogin}
                  onSuccess={handleResetSuccess}
                />
              </motion.div>
            ) : activeTab === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <LoginPage
                  onForgotPassword={() => setAuthView('forgot')}
                  onLoginSuccess={(user, token, refreshToken) =>
                    handleAuthSuccess(user, token, refreshToken, 'Login successful')
                  }
                />
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <SignupPage
                  onSignupSuccess={(user) =>
                    handleAuthSuccess(user, null, null, 'Account created successfully')
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
