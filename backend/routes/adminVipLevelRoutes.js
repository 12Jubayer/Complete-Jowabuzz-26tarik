import { Router } from 'express';
import {
  bulkUpdateAdminVipLevels,
  createAdminVipLevel,
  deleteAdminVipLevel,
  getAdminVipLevels,
  updateAdminVipLevel,
} from '../controllers/adminVipLevelController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/vip-levels', getAdminVipLevels);
router.post('/vip-levels', createAdminVipLevel);
router.put('/vip-levels/bulk-update', bulkUpdateAdminVipLevels);
router.put('/vip-levels/:id', updateAdminVipLevel);
router.delete('/vip-levels/:id', deleteAdminVipLevel);

export default router;
