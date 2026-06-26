import { verifyToken } from '../utils/jwt.js';

export function flexChatAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    try {
      const decoded = verifyToken(token);
      if (['admin', 'super_admin'].includes(decoded.role)) {
        req.admin = decoded;
        return next();
      }
      if (decoded.role === 'user') {
        req.user = decoded;
        return next();
      }
    } catch {
      // Fall through to guest auth.
    }
  }

  req.guestId = String(req.headers['x-guest-id'] || req.body?.guestId || '').trim() || null;

  if (req.guestId) {
    return next();
  }

  return res.status(401).json({ error: 'Authentication required' });
}

export default flexChatAuth;
