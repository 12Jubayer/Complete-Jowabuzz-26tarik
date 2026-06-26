import { Router } from 'express';
import {
  getAffiliateCommission,
  getAffiliateDashboard,
  getAffiliateProfile,
  getAffiliateReferrals,
  getAffiliateSettlements,
  updateAffiliateSettlementUser,
} from '../controllers/affiliateDashboardController.js';
import {
  getAffiliateWithdrawHistory,
  requestAffiliateWithdraw,
} from '../controllers/affiliateWithdrawController.js';
import { rateLimit, requireAffiliateAuth } from '../middleware/affiliateAuth.js';
import { affiliateResponseSanitizer } from '../middleware/affiliateResponseSanitizer.js';

const router = Router();

router.use(requireAffiliateAuth);
router.use(affiliateResponseSanitizer);
router.use(rateLimit({ windowMs: 60_000, max: 120, keyPrefix: 'affiliate-api' }));

router.get('/dashboard', getAffiliateDashboard);
router.get('/referrals', getAffiliateReferrals);
router.get('/settlements', getAffiliateSettlements);
router.get('/commission', getAffiliateCommission);
router.get('/profile', getAffiliateProfile);
router.put('/profile/settlement-user', updateAffiliateSettlementUser);
router.get('/withdraw/history', getAffiliateWithdrawHistory);
router.post('/withdraw', requestAffiliateWithdraw);

export default router;
