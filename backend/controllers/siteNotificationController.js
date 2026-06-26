import { verifyToken } from '../utils/jwt.js';
import {
  getUserUnreadNotificationCount,
  listUserNotifications,
  markUserNotificationRead,
} from '../services/notificationService.js';
import { subscribeUserNotifications } from '../services/notificationEventBus.js';

function getUserIdFromRequest(req) {
  return Number(req.user?.sub);
}

export async function getSiteNotifications(req, res) {
  try {
    const userId = getUserIdFromRequest(req);
    const result = await listUserNotifications(userId, {
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.json(result);
  } catch (error) {
    console.error('Get site notifications error:', error);
    return res.status(500).json({ error: 'Failed to load notifications' });
  }
}

export async function getSiteNotificationUnreadCount(req, res) {
  try {
    const userId = getUserIdFromRequest(req);
    const unreadCount = await getUserUnreadNotificationCount(userId);
    return res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    return res.status(500).json({ error: 'Failed to load unread count' });
  }
}

export async function markSiteNotificationRead(req, res) {
  try {
    const userId = getUserIdFromRequest(req);
    await markUserNotificationRead(Number(req.params.id), userId);
    const result = await listUserNotifications(userId);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update notification',
    });
  }
}

export async function streamSiteNotifications(req, res) {
  const header = req.headers.authorization || '';
  const queryToken = String(req.query.token || '').trim();
  const token = header.startsWith('Bearer ') ? header.slice(7) : queryToken;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let decoded;
  try {
    decoded = verifyToken(token);
    if (decoded.role !== 'user') {
      return res.status(403).json({ error: 'User access required' });
    }
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const userId = Number(decoded.sub);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 25000);

  const listener = (payload) => {
    res.write(`event: notification\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  const unsubscribe = subscribeUserNotifications(userId, listener);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}

export default getSiteNotifications;
