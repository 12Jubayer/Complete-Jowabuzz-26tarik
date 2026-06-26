import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'jowabuzz-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

export function signAdminToken(admin) {
  return jwt.sign(
    {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role || 'admin',
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

export function signAgentToken(agent) {
  return jwt.sign(
    {
      sub: agent.id,
      mobile: agent.mobile,
      name: agent.name,
      role: 'agent',
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

export function signAffiliateToken(affiliate) {
  return jwt.sign(
    {
      sub: affiliate.id,
      userId: affiliate.user_id,
      name: affiliate.name,
      referralCode: affiliate.referral_code,
      role: 'affiliate',
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

export function signUserToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      name: user.name,
      phone: user.phone,
      role: 'user',
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

export function signUserRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: 'user',
      type: 'refresh',
    },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export { JWT_SECRET, jwt };
