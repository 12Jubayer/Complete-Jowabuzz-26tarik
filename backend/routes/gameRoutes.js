import { Router } from 'express';
import {
  getUserBalance,
  resolveGameByCode,
  startGame,
  submitGameResult,
} from '../controllers/gameController.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { requireUserAuth } from '../middleware/userAuth.js';

const router = Router();

router.use(requireUserAuth);
router.use(rateLimit({ windowMs: 60_000, max: 120, keyPrefix: 'game' }));

router.get('/balance', getUserBalance);
router.get('/lookup/:code', resolveGameByCode);
router.post('/start', startGame);
router.post('/result', submitGameResult);

export default router;
