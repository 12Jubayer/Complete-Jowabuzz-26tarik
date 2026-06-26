import { Router } from 'express';
import {
  getAdminWeeklyCashback,
  getAdminWeeklyCashbackPayouts,
  putAdminWeeklyCashback,
} from '../controllers/adminWeeklyCashbackController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/weekly-cashback', getAdminWeeklyCashback);
router.put('/weekly-cashback', putAdminWeeklyCashback);
router.get('/weekly-cashback/payouts', getAdminWeeklyCashbackPayouts);

export default router;
