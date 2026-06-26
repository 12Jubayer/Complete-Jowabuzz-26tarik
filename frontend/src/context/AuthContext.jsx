import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchLiveBalance } from '../services/gameWalletService';
import {
  getCurrentUser,
  isAuthenticated,
  logout as clearSession,
  setSession,
  persistAuthTokens,
} from '../utils/auth';
import { getUserToken, ensureValidUserToken } from '../utils/userAuth';

const AuthContext = createContext(null);

function resolveSessionUser() {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return null;
  }

  if (!isAuthenticated() && !getUserToken()) {
    clearSession();
    return null;
  }

  return currentUser;
}

function hasActiveSession(user) {
  return Boolean(user && (isAuthenticated() || getUserToken()));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => resolveSessionUser());

  useEffect(() => {
    const sessionUser = resolveSessionUser();
    setUser(sessionUser);

    if (!sessionUser) return undefined;

    let active = true;

    ensureValidUserToken().then((token) => {
      if (!active) return;
      if (!token && !isAuthenticated()) {
        clearSession();
        setUser(null);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!getUserToken()) return null;

    try {
      const data = await fetchLiveBalance();
      if (data?.balance === undefined || data?.balance === null) {
        return user?.balance ?? null;
      }
      setUser((current) => {
        if (!current) return current;
        const nextUser = { ...current, balance: data.balance };
        setSession(nextUser, getUserToken());
        return nextUser;
      });
      return data.balance;
    } catch (error) {
      console.warn('[AuthContext] refreshBalance failed, keeping cached balance', error?.message);
      return user?.balance ?? null;
    }
  }, [user?.balance]);

  const value = useMemo(
    () => ({
      user,
      loggedIn: hasActiveSession(user),
      login: (userData, token = null, refreshToken = null) => {
        persistAuthTokens(token, refreshToken);
        const sessionUser = setSession(userData, token || getUserToken());
        setUser(sessionUser);
      },
      syncUser: (userData) => {
        const token = getUserToken();
        if (!token) return;
        const sessionUser = setSession(userData, token);
        setUser(sessionUser);
      },
      logout: () => {
        clearSession();
        setUser(null);
        window.location.replace('/');
      },
      refreshBalance,
      updateBalance: (balance) => {
        setUser((current) => {
          if (!current) return current;
          const nextUser = { ...current, balance };
          setSession(nextUser, getUserToken());
          return nextUser;
        });
      },
    }),
    [user, refreshBalance],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
