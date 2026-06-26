import { Router } from 'express';
import { getAgentDashboard, getAgentMe } from '../controllers/agentDashboardController.js';
import {
  createTopupRequest,
  getAgentTransactions,
} from '../controllers/agentTransactionsController.js';
import { depositToPlayer, searchPlayers, withdrawFromPlayer } from '../controllers/agentPlayerController.js';
import { confirmPlayerWithdrawByOtp, getPendingPlayerWithdrawRequests } from '../controllers/agentPlayerWithdrawOtpController.js';
import { getAgentCommissions, getAgentCommissionSettlements } from '../controllers/agentCommissionController.js';
import { requireAgentAuth } from '../middleware/agentAuth.js';

const router = Router();

router.use(requireAgentAuth);

router.get('/me', getAgentMe);
router.get('/dashboard', getAgentDashboard);
router.get('/transactions', getAgentTransactions);
router.get('/commissions', getAgentCommissions);
router.get('/commission/settlements', getAgentCommissionSettlements);
router.get('/players/search', searchPlayers);
router.post('/players/deposit', depositToPlayer);
router.post('/players/withdraw', withdrawFromPlayer);
router.get('/players/withdraw/pending', getPendingPlayerWithdrawRequests);
router.post('/players/withdraw/confirm-otp', confirmPlayerWithdrawByOtp);
router.post('/topup-request', createTopupRequest);

export default router;
