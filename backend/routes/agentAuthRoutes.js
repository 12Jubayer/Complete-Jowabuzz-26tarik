import { Router } from 'express';
import { loginAgent } from '../controllers/agentAuthController.js';

const router = Router();

router.post('/login', loginAgent);

export default router;
