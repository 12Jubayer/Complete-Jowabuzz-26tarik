import { Router } from 'express';
import {
  changeAdminAccountPassword,
  createAdminAccount,
  deleteAdminAccount,
  deleteSubAdmin,
  getAdminById,
  listAdmins,
  updateAdminAccountStatus,
  updateAdminPermissions,
  updateSubAdminStatus,
} from '../controllers/adminManageController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import { requireSuperAdmin } from '../middleware/requireSuperAdmin.js';

const router = Router();

router.use(requireAdminAuth);

router.put('/sub-admins/:id/status', requireSuperAdmin, updateSubAdminStatus);
router.delete('/sub-admins/:id', requireSuperAdmin, deleteSubAdmin);

router.get('/admins', listAdmins);
router.post('/admins', createAdminAccount);
router.get('/admins/:id', getAdminById);
router.post('/admins/:id/permissions', updateAdminPermissions);
router.post('/admins/:id/status', updateAdminAccountStatus);
router.post('/admins/:id/change-password', changeAdminAccountPassword);
router.delete('/admins/:id', deleteAdminAccount);

export default router;
