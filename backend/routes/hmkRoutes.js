import { Router } from 'express';
import { handleHmkCallback, getHmkAdminStatus, launchHmkGame } from '../controllers/hmkController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import { requireUserAuth } from '../middleware/userAuth.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.post(
  '/hmk/callback',
  rateLimit({ windowMs: 60_000, max: 600, keyPrefix: 'hmk-callback' }),
  handleHmkCallback,
);
router.post('/hmk/launch', requireUserAuth, rateLimit({ windowMs: 60_000, max: 120, keyPrefix: 'hmk-launch' }), launchHmkGame);
router.get('/admin/hmk/status', requireAdminAuth, getHmkAdminStatus);
router.get('/hmk/health', getHmkAdminStatus);

export default router;
