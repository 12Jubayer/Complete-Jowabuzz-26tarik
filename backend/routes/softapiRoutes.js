import { Router } from 'express';
import {
  getSoftApiAdminStatus,
  handleSoftApiCallback,
  launchSoftApiGame,
} from '../controllers/softapiController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import { requireUserAuth } from '../middleware/userAuth.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.post('/softapi/callback', rateLimit({ windowMs: 60_000, max: 600, keyPrefix: 'softapi-callback' }), handleSoftApiCallback);
router.post('/softapi/launch', requireUserAuth, rateLimit({ windowMs: 60_000, max: 120, keyPrefix: 'softapi-launch' }), launchSoftApiGame);
router.get('/admin/softapi/status', requireAdminAuth, getSoftApiAdminStatus);

export default router;
