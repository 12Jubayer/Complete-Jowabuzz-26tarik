import { Router } from 'express';
import {
  approveAdminDeposit,
  listAdminDeposits,
  rejectAdminDeposit,
} from '../controllers/adminDepositController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/deposits', listAdminDeposits);
router.post('/deposits/:id/approve', approveAdminDeposit);
router.post('/deposits/:id/reject', rejectAdminDeposit);

export default router;
