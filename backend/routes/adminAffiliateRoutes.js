import { Router } from 'express';
import {
  approveAffiliate,
  blockAffiliate,
  changeAffiliatePassword,
  completeAdminSettlement,
  createAdminAffiliate,
  getAdminAffiliateUsers,
  getAdminSettlements,
  getAdminWithdrawRequests,
  getCommissionSettings,
  getReferralStatistics,
  rejectAdminSettlement,
  rejectAffiliate,
  runAdminSettlement,
  updateAffiliateCommission,
  updateGlobalCommission,
  updateSettlementSettings,
  updateWithdrawRequestStatus,
} from '../controllers/adminAffiliateController.js';
import {
  createCommissionPeriodHandler,
  getCommissionPeriods,
  updateCommissionPeriodHandler,
} from '../controllers/adminAffiliateCommissionPeriodController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/affiliate/users', getAdminAffiliateUsers);
router.post('/affiliate/users', createAdminAffiliate);
router.post('/affiliate/approve', approveAffiliate);
router.post('/affiliate/reject', rejectAffiliate);
router.post('/affiliate/block', blockAffiliate);
router.post('/affiliate/commission', updateAffiliateCommission);
router.post('/affiliate/commission/global', updateGlobalCommission);
router.get('/affiliate/commission/settings', getCommissionSettings);
router.post('/affiliate/settlement/settings', updateSettlementSettings);
router.get('/affiliate/settlements', getAdminSettlements);
router.post('/affiliate/settle', runAdminSettlement);
router.post('/affiliate/settlement/complete', completeAdminSettlement);
router.post('/affiliate/settlement/reject', rejectAdminSettlement);
router.post('/affiliate/change-password', changeAffiliatePassword);
router.get('/affiliate/withdraw-requests', getAdminWithdrawRequests);
router.post('/affiliate/withdraw-requests/status', updateWithdrawRequestStatus);
router.get('/affiliate/referral-statistics', getReferralStatistics);
router.get('/affiliate/commission-periods', getCommissionPeriods);
router.post('/affiliate/commission-periods', createCommissionPeriodHandler);
router.put('/affiliate/commission-periods/:id', updateCommissionPeriodHandler);

export default router;
