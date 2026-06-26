import { Router } from 'express';
import { getSiteGames, getSiteHotGames, getSiteProviders } from '../controllers/siteGameController.js';

const router = Router();

router.get('/public/games/hot', getSiteHotGames);
router.get('/site/games', getSiteGames);
router.get('/site/providers', getSiteProviders);

export default router;
