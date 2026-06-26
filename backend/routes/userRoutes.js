import { Router } from 'express';
import { getUserBonusStatus } from '../controllers/depositBonusController.js';
import {
  changeUserPassword,
  createDepositRequest,
  createUpdateProfileRequest,
  createWithdrawRequest,
  getBankDetails,
  getBettingRecords,
  getReferralInfo,
  getUserBonus,
  getUserMessages,
  getUserProfile,
  getUserTransactions,
  getUserTurnover,
  getUserWallet,
  saveBankDetails,
} from '../controllers/userProfileController.js';
import { getUserBalance } from '../controllers/gameController.js';
import {
  createWithdrawRequestWithOtp,
  requestUserWithdrawOtp,
} from '../controllers/userWithdrawOtpController.js';
import {
  getPlayerAgentWithdrawRequests,
  requestPlayerAgentWithdrawOtp,
} from '../controllers/userAgentWithdrawController.js';
import { requireUserAuth } from '../middleware/userAuth.js';

const router = Router();

router.use(requireUserAuth);

router.get('/profile', getUserProfile);
router.get('/balance', getUserBalance);
router.get('/wallet', getUserWallet);
router.get('/transactions', getUserTransactions);
router.get('/turnover', getUserTurnover);
router.get('/bonus', getUserBonus);
router.get('/bonus/status', getUserBonusStatus);
router.get('/betting-records', getBettingRecords);
router.get('/messages', getUserMessages);
router.get('/referral', getReferralInfo);
router.get('/bank-details', getBankDetails);
router.post('/deposit-request', createDepositRequest);
router.post('/withdraw-request', createWithdrawRequest);
router.post('/withdraw/request-otp', requestUserWithdrawOtp);
router.post('/withdraw/confirm', createWithdrawRequestWithOtp);
router.post('/withdraw/agent/request-otp', requestPlayerAgentWithdrawOtp);
router.get('/withdraw/agent/requests', getPlayerAgentWithdrawRequests);
router.post('/change-password', changeUserPassword);
router.post('/update-profile-request', createUpdateProfileRequest);
router.post('/bank-details', saveBankDetails);

export default router;
