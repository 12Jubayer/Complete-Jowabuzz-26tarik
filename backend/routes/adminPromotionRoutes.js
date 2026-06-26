import { Router } from 'express';
import {
  createAdminPromotion,
  deleteAdminPromotion,
  getAdminPromotions,
  reorderAdminPromotions,
  updateAdminPromotion,
} from '../controllers/adminPromotionController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/promotions', getAdminPromotions);
router.post('/promotions/reorder', reorderAdminPromotions);
router.post('/promotions', createAdminPromotion);
router.put('/promotions/:id', updateAdminPromotion);
router.delete('/promotions/:id', deleteAdminPromotion);

export default router;
