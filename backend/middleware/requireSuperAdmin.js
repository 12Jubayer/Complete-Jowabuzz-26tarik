export function requireSuperAdmin(req, res, next) {
  if (req.admin?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only super admin can perform this action' });
  }

  return next();
}

export default requireSuperAdmin;
