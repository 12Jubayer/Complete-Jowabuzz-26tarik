import { Router } from 'express';
import { getPublicPromotions } from '../controllers/promotionController.js';

const router = Router();

router.get('/promotions', getPublicPromotions);
router.get('/site/promotions', getPublicPromotions);

export default router;
