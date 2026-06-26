import { Router } from 'express';
import {
  getAdminGamingApiSettings,
  getAdminGamingTransactions,
  getAdminGamingTransactionsExportCsv,
  getAdminGamingTransactionsExportPdf,
  postAdminGamingApiSettingsDisable,
  postAdminGamingApiSettingsEnable,
  postAdminGamingApiSettingsTestConnection,
  postAdminGamingApiSettingsTestGameLaunch,
  putAdminGamingApiSettings,
} from '../controllers/gamingApiSettingsController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/gaming-api-settings', getAdminGamingApiSettings);
router.put('/gaming-api-settings', putAdminGamingApiSettings);
router.post('/gaming-api-settings/test-connection', postAdminGamingApiSettingsTestConnection);
router.post('/gaming-api-settings/test-game-launch', postAdminGamingApiSettingsTestGameLaunch);
router.post('/gaming-api-settings/enable', postAdminGamingApiSettingsEnable);
router.post('/gaming-api-settings/disable', postAdminGamingApiSettingsDisable);
router.get('/gaming-api-settings/transactions', getAdminGamingTransactions);
router.get('/gaming-api-settings/transactions/export/csv', getAdminGamingTransactionsExportCsv);
router.get('/gaming-api-settings/transactions/export/pdf', getAdminGamingTransactionsExportPdf);

export default router;
