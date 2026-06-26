import { Router } from 'express';
import {
  getAdminNotificationAudienceCounts,
  getAdminNotifications,
  postAdminNotification,
} from '../controllers/adminNotificationController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/notifications', getAdminNotifications);
router.get('/notifications/audience-counts', getAdminNotificationAudienceCounts);
router.post('/notifications', postAdminNotification);

export default router;
