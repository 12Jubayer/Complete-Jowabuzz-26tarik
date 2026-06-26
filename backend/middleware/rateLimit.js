const buckets = new Map();

export function rateLimit({ windowMs = 60_000, max = 60, keyPrefix = 'rl' } = {}) {
  return (req, res, next) => {
    const identity = req.user?.sub || req.ip || 'anonymous';
    const key = `${keyPrefix}:${identity}:${req.path}`;
    const now = Date.now();
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > max) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    return next();
  };
}

export default rateLimit;
