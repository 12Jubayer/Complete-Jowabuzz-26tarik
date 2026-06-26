import { Router } from 'express';
import {
  deleteAdminAgentApplication,
  getAdminAgentApplication,
  listAdminAgentApplications,
  updateAdminAgentApplicationStatus,
} from '../controllers/adminAgentApplicationController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/agent-applications', listAdminAgentApplications);
router.get('/agent-applications/:id', getAdminAgentApplication);
router.put('/agent-applications/:id/status', updateAdminAgentApplicationStatus);
router.delete('/agent-applications/:id', deleteAdminAgentApplication);

export default router;
