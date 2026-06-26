import { Router } from 'express';
import { getPublicGameProviders } from '../controllers/siteGameController.js';

const router = Router();

router.get('/game-providers', getPublicGameProviders);

export default router;
