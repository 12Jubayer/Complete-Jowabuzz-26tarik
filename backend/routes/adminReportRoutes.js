import { Router } from 'express';
import { listAdminReports } from '../controllers/adminReportController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/reports', listAdminReports);

export default router;
