import { Router } from 'express';
import {
  deleteAdminGameImageHandler,
  getAdminGameImages,
  updateAdminGameImageHandler,
} from '../controllers/adminGameImageController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/game-images', getAdminGameImages);
router.put('/game-images/:gameId', updateAdminGameImageHandler);
router.delete('/game-images/:gameId', deleteAdminGameImageHandler);

export default router;
