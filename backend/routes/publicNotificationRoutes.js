import { Router } from 'express';
import {
  getSiteNotificationUnreadCount,
  getSiteNotifications,
  markSiteNotificationRead,
  streamSiteNotifications,
} from '../controllers/siteNotificationController.js';
import { requireUserAuth } from '../middleware/userAuth.js';

const router = Router();

router.get('/site/notifications/stream', streamSiteNotifications);
router.get('/site/notifications', requireUserAuth, getSiteNotifications);
router.get('/site/notifications/unread-count', requireUserAuth, getSiteNotificationUnreadCount);
router.patch('/site/notifications/:id/read', requireUserAuth, markSiteNotificationRead);

export default router;
