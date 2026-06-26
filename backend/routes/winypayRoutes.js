import express from 'express';
import {
  winypayDepositCallback,
  winypayStatus,
  winypayWithdrawCallback,
} from '../controllers/winypayController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

router.post(
  '/payment/winypay/deposit-callback',
  rateLimit({ windowMs: 60_000, max: 600, keyPrefix: 'winypay-deposit-callback' }),
  winypayDepositCallback,
);
router.post(
  '/payment/winypay/withdraw-callback',
  rateLimit({ windowMs: 60_000, max: 600, keyPrefix: 'winypay-withdraw-callback' }),
  winypayWithdrawCallback,
);
router.get('/admin/winypay/status', requireAdminAuth, winypayStatus);

export default router;
