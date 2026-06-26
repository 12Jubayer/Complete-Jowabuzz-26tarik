import { Router } from 'express';
import {
  adjustAdminEWalletBalance,
  createAdminEWallet,
  deleteAdminEWallet,
  getAdminEWalletInfo,
  listAdminEWallets,
  updateAdminEWalletStatus,
} from '../controllers/adminEWalletController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/e-wallets', listAdminEWallets);
router.post('/e-wallets', createAdminEWallet);
router.get('/e-wallets/:id/info', getAdminEWalletInfo);
router.post('/e-wallets/:id/status', updateAdminEWalletStatus);
router.post('/e-wallets/:id/adjust-balance', adjustAdminEWalletBalance);
router.delete('/e-wallets/:id', deleteAdminEWallet);

export default router;
