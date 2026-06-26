import { Router } from 'express';
import {
  approveAffiliateReleaseRecord,
  listAffiliateReleaseRecords,
  rejectAffiliateReleaseRecord,
  releaseAffiliateReleaseRecord,
} from '../controllers/adminAffiliateReleaseController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/affiliates-release-list', listAffiliateReleaseRecords);
router.post('/affiliate-release/:id/approve', approveAffiliateReleaseRecord);
router.post('/affiliate-release/:id/reject', rejectAffiliateReleaseRecord);
router.post('/affiliate-release/:id/release', releaseAffiliateReleaseRecord);

export default router;
