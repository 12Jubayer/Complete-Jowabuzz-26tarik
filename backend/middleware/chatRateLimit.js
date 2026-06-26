const buckets = new Map();
const WINDOW_MS = 60_000;
const MAX_MESSAGES = 20;

function cleanupExpired(now) {
  for (const [key, entry] of buckets.entries()) {
    if (now - entry.startedAt > WINDOW_MS) {
      buckets.delete(key);
    }
  }
}

function getClientKey(req) {
  const userId = req.user?.sub;
  if (userId) return `user:${userId}`;
  if (req.guestId) return `guest:${req.guestId}`;
  return `ip:${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`;
}

export function chatMessageRateLimit(req, res, next) {
  const now = Date.now();
  cleanupExpired(now);

  const key = getClientKey(req);
  const entry = buckets.get(key);

  if (!entry || now - entry.startedAt > WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return next();
  }

  if (entry.count >= MAX_MESSAGES) {
    return res.status(429).json({ error: 'Too many messages. Please wait a moment.' });
  }

  entry.count += 1;
  buckets.set(key, entry);
  return next();
}

export default chatMessageRateLimit;
