import { Router } from 'express';
import { getAdminMe, loginAdmin } from '../controllers/adminAuthController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.post('/login', loginAdmin);
router.get('/me', requireAdminAuth, getAdminMe);

export default router;
