import { Router } from 'express';
import {
  getAdminBonusProgressDetail,
  getAdminBonusProgressList,
  putAdminBonusProgressCancel,
  putAdminBonusProgressReset,
} from '../controllers/bonusUserProgressController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/bonus-progress', getAdminBonusProgressList);
router.get('/bonus-progress/:id', getAdminBonusProgressDetail);
router.put('/bonus-progress/:id/cancel', putAdminBonusProgressCancel);
router.put('/bonus-progress/:id/reset', putAdminBonusProgressReset);

export default router;
