import { Router } from 'express';
import {
  deleteAdminDepositBonusRule,
  getAdminDepositBonusRules,
  getAdminDepositBonusUsers,
  postAdminDepositBonusRule,
  putAdminDepositBonusRule,
  putAdminDepositBonusUserCancel,
} from '../controllers/depositBonusController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/deposit-bonus', getAdminDepositBonusRules);
router.post('/deposit-bonus', postAdminDepositBonusRule);
router.put('/deposit-bonus/:id', putAdminDepositBonusRule);
router.delete('/deposit-bonus/:id', deleteAdminDepositBonusRule);

router.get('/deposit-bonus/rules', getAdminDepositBonusRules);
router.post('/deposit-bonus/rules', postAdminDepositBonusRule);
router.put('/deposit-bonus/rules/:id', putAdminDepositBonusRule);
router.delete('/deposit-bonus/rules/:id', deleteAdminDepositBonusRule);
router.get('/deposit-bonus/users', getAdminDepositBonusUsers);
router.put('/deposit-bonus/users/:id/cancel', putAdminDepositBonusUserCancel);

export default router;
