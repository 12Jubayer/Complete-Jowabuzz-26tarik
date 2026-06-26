import { Router } from 'express';
import { handleGamingWebhook } from '../controllers/gamingWebhookController.js';

const router = Router();

router.post('/gaming/webhook', handleGamingWebhook);

export default router;
