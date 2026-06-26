import { Router } from 'express';
import {
  approveAdminBonus,
  listAdminBonuses,
  rejectAdminBonus,
} from '../controllers/adminBonusController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/bonus', listAdminBonuses);
router.post('/bonus/:id/approve', approveAdminBonus);
router.post('/bonus/:id/reject', rejectAdminBonus);

export default router;
