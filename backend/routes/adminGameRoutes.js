import { Router } from 'express';
import {
  deleteAdminHotGame,
  getAdminGames,
  getAdminGamesSearch,
  getAdminHotGames,
  patchAdminGameToggle,
  postAdminGamesBulkToggle,
  postAdminGamesSyncOracle,
  postAdminHotGame,
  putAdminGameUpdateFlags,
  putAdminGamesBulkUpdateFlags,
} from '../controllers/adminGameController.js';
import {
  getAdminProviders,
  patchAdminProviderToggle,
  postAdminProvidersSync,
} from '../controllers/adminProviderController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/hot-games', getAdminHotGames);
router.post('/hot-games', postAdminHotGame);
router.delete('/hot-games/:id', deleteAdminHotGame);

router.get('/games/search', getAdminGamesSearch);
router.get('/games', getAdminGames);
router.put('/games/bulk-update-flags', putAdminGamesBulkUpdateFlags);
router.put('/games/:id/update-flags', putAdminGameUpdateFlags);
router.patch('/games/:id/toggle', patchAdminGameToggle);
router.post('/games/bulk-toggle', postAdminGamesBulkToggle);
router.post('/games/sync-oracle', postAdminGamesSyncOracle);

router.get('/providers', getAdminProviders);
router.patch('/providers/:id/toggle', patchAdminProviderToggle);
router.post('/providers/sync', postAdminProvidersSync);

export default router;
