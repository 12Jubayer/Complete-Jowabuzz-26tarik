import { Router } from 'express';
import {
  getDashboardStats,
  getGameReports,
  updateTransactionStatus,
} from '../controllers/adminDashboardController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.get('/dashboard-stats', requireAdminAuth, getDashboardStats);
router.get('/game-reports', requireAdminAuth, getGameReports);
router.patch('/transactions/:id/status', requireAdminAuth, updateTransactionStatus);

export default router;
