import { Router } from 'express';
import {
  adjustAdminAffiliateBalance,
  approveAdminAffiliateUser,
  changeAdminAffiliatePassword,
  createAdminAffiliateUser,
  getAdminAffiliateInfo,
  listAdminAffiliates,
  rejectAdminAffiliateUser,
  updateAdminAffiliateUserStatus,
} from '../controllers/adminAffiliateUserController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/affiliates', listAdminAffiliates);
router.post('/affiliates', createAdminAffiliateUser);
router.get('/affiliates/:id/info', getAdminAffiliateInfo);
router.post('/affiliates/:id/approve', approveAdminAffiliateUser);
router.post('/affiliates/:id/reject', rejectAdminAffiliateUser);
router.post('/affiliates/:id/status', updateAdminAffiliateUserStatus);
router.post('/affiliates/:id/adjust-balance', adjustAdminAffiliateBalance);
router.post('/affiliates/:id/change-password', changeAdminAffiliatePassword);

export default router;
