import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchSiteNotifications,
  markSiteNotificationRead,
  subscribeSiteNotificationStream,
} from '../services/siteNotificationService';
import { getUserToken } from '../utils/userAuth';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { loggedIn, refreshBalance } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!loggedIn || !getUserToken()) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const result = await fetchSiteNotifications({ limit: 50 });
      setNotifications(result.data || []);
      setUnreadCount(Number(result.unreadCount || 0));
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!loggedIn || !getUserToken()) return undefined;

    const unsubscribe = subscribeSiteNotificationStream(
      (payload) => {
        refresh();
        const title = String(payload?.title || '').toLowerCase();
        if (
          title.includes('cashback')
          || title.includes('bonus')
          || title.includes('deposit')
          || title.includes('withdraw')
        ) {
          refreshBalance();
        }
      },
      () => {},
    );

    return unsubscribe;
  }, [loggedIn, refresh, refreshBalance]);

  const markAsRead = useCallback(
    async (id) => {
      const result = await markSiteNotificationRead(id);
      setNotifications(result.data || []);
      setUnreadCount(Number(result.unreadCount || 0));
      return result;
    },
    [],
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refresh,
      markAsRead,
    }),
    [notifications, unreadCount, loading, refresh, markAsRead],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }

  return context;
}
