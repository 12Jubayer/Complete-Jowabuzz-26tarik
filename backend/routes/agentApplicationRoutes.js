import { Router } from 'express';
import { submitAgentApplication } from '../controllers/agentApplicationController.js';

const router = Router();

router.post('/agent-applications', submitAgentApplication);

export default router;
