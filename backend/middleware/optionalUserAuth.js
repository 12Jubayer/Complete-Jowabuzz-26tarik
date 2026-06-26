import { verifyToken } from '../utils/jwt.js';

export function optionalUserAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (token) {
    try {
      const decoded = verifyToken(token);
      if (decoded.role === 'user') {
        req.user = decoded;
      }
    } catch {
      // Ignore invalid tokens for optional auth routes.
    }
  }

  const guestHeader = String(req.headers['x-guest-id'] || '').trim();
  const guestBody = String(req.body?.guestId || '').trim();
  req.guestId = guestHeader || guestBody || null;
  return next();
}

export default optionalUserAuth;
