import { Router } from 'express';
import {
  getProfile,
  putProfile,
  putProfilePassword,
} from '../controllers/adminProfileController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/profile', getProfile);
router.put('/profile', putProfile);
router.put('/profile/password', putProfilePassword);

export default router;
