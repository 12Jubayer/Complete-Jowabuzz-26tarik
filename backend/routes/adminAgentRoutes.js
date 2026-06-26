import { Router } from 'express';
import {
  adjustAdminAgentBalance,
  createAdminAgent,
  deleteAdminAgent,
  getAdminAgentInfo,
  listAdminAgents,
  updateAdminAgentStatus,
} from '../controllers/adminAgentController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/agents', listAdminAgents);
router.post('/agents', createAdminAgent);
router.get('/agents/:id/info', getAdminAgentInfo);
router.post('/agents/:id/status', updateAdminAgentStatus);
router.post('/agents/:id/adjust-balance', adjustAdminAgentBalance);
router.delete('/agents/:id', deleteAdminAgent);

export default router;
