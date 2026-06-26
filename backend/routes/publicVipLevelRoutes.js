import { Router } from 'express';
import { getPublicVipLevels } from '../controllers/vipLevelController.js';

const router = Router();

router.get('/vip-levels', getPublicVipLevels);

export default router;
