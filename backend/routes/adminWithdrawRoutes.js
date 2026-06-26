import { Router } from 'express';
import {
  approveAdminWithdrawal,
  listAdminWithdrawals,
  rejectAdminWithdrawal,
} from '../controllers/adminWithdrawController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/withdrawals', listAdminWithdrawals);
router.post('/withdrawals/:id/approve', approveAdminWithdrawal);
router.post('/withdrawals/:id/reject', rejectAdminWithdrawal);

export default router;
