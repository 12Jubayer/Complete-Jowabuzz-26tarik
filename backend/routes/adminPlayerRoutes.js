import { Router } from 'express';
import {
  adjustAdminPlayerBalance,
  changeAdminPlayerPassword,
  createAdminPlayer,
  deleteAdminPlayer,
  getAdminPlayerInfo,
  listAdminPlayers,
  updateAdminPlayerStatus,
  updateAdminPlayerWithdrawBlock,
  updateAdminPlayerWithdrawChannel,
} from '../controllers/adminPlayerController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import requireSuperAdmin from '../middleware/requireSuperAdmin.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/players', listAdminPlayers);
router.post('/players', createAdminPlayer);
router.get('/players/:id/info', getAdminPlayerInfo);
router.post('/players/:id/change-password', changeAdminPlayerPassword);
router.delete('/players/:id', deleteAdminPlayer);
router.post('/players/:id/status', updateAdminPlayerStatus);
router.post('/players/:id/withdraw-block', updateAdminPlayerWithdrawBlock);
router.post('/players/:id/adjust-balance', adjustAdminPlayerBalance);
router.post('/players/:id/withdraw-channel', requireSuperAdmin, updateAdminPlayerWithdrawChannel);

export default router;
