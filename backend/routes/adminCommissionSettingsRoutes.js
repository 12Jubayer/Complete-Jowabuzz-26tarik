import { Router } from 'express';
import {
  getAdminCommissionRecords,
  getAdminCommissionRecordsExportCsv,
  getAdminCommissionRecordsExportPdf,
  getAdminCommissionSettings,
  postAdminCommissionRecordApprove,
  postAdminCommissionRecordReject,
  postAdminCommissionSettingsReset,
  putAdminCommissionSettings,
} from '../controllers/commissionSettingsController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/commission-settings', getAdminCommissionSettings);
router.put('/commission-settings', putAdminCommissionSettings);
router.post('/commission-settings/reset', postAdminCommissionSettingsReset);
router.get('/commission-settings/records', getAdminCommissionRecords);
router.get('/commission-settings/records/export/csv', getAdminCommissionRecordsExportCsv);
router.get('/commission-settings/records/export/pdf', getAdminCommissionRecordsExportPdf);
router.post('/commission-settings/records/:source/:id/approve', postAdminCommissionRecordApprove);
router.post('/commission-settings/records/:source/:id/reject', postAdminCommissionRecordReject);

export default router;
