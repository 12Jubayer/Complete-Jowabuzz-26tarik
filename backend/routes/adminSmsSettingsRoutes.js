import { Router } from 'express';
import {
  getAdminSmsLogs,
  getAdminSmsSettings,
  postAdminSmsBulkSend,
  postAdminSmsSettingsDisable,
  postAdminSmsSettingsEnable,
  postAdminSmsSettingsTest,
  putAdminSmsSettings,
} from '../controllers/smsApiSettingsController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/sms-settings', getAdminSmsSettings);
router.put('/sms-settings', putAdminSmsSettings);
router.post('/sms-settings/test-sms', postAdminSmsSettingsTest);
router.post('/sms-settings/enable', postAdminSmsSettingsEnable);
router.post('/sms-settings/disable', postAdminSmsSettingsDisable);
router.get('/sms-settings/logs', getAdminSmsLogs);
router.post('/sms-settings/bulk-send', postAdminSmsBulkSend);

export default router;
