import { Router } from 'express';
import {
  getAdminGeneralSettings,
  getAdminGeneralSettingsSection,
  putAdminGeneralSettingsSection,
} from '../controllers/generalSettingsController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/general-settings', getAdminGeneralSettings);
router.get('/general-settings/:section', getAdminGeneralSettingsSection);
router.put('/general-settings/:section', putAdminGeneralSettingsSection);

export default router;
