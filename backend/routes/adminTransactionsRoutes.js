import { Router } from 'express';
import {
  approveAdminTransaction,
  listAdminTransactions,
  rejectAdminTransaction,
} from '../controllers/adminTransactionsController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/transactions', listAdminTransactions);
router.post('/transactions/:id/approve', approveAdminTransaction);
router.post('/transactions/:id/reject', rejectAdminTransaction);

export default router;
