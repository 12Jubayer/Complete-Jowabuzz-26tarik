import { Router } from 'express';
import {
  activateSettlementPeriodHandler,
  createSettlementPeriodHandler,
  getPeriodSettlements,
  getSettlementPeriods,
  runActivePeriodSettlement,
  updateSettlementPeriodHandler,
} from '../controllers/adminAffiliateSettlementPeriodController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/affiliate/settlement-periods', getSettlementPeriods);
router.post('/affiliate/settlement-periods', createSettlementPeriodHandler);
router.put('/affiliate/settlement-periods/:id', updateSettlementPeriodHandler);
router.post('/affiliate/settlement-periods/:id/activate', activateSettlementPeriodHandler);
router.post('/affiliate/settlement-periods/run', runActivePeriodSettlement);
router.get('/affiliate/period-settlements', getPeriodSettlements);

export default router;
