import { verifyToken } from '../utils/jwt.js';

export function requireAgentAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = verifyToken(token);

    if (decoded.role !== 'agent') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.agent = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export default requireAgentAuth;
