import { Router } from 'express';
import {
  getAdminNoticeConfig,
  getAdminPaymentMethods,
  getAdminHomepageSliders,
  getAdminSocialLinks,
  getAdminBranding,
  updateAdminNoticeConfig,
  updateAdminPaymentMethods,
  updateAdminHomepageSliders,
  updateAdminSocialLinks,
  updateAdminBranding,
} from '../controllers/siteConfigController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/site-config/notice', getAdminNoticeConfig);
router.put('/site-config/notice', updateAdminNoticeConfig);
router.get('/site-config/payment-methods', getAdminPaymentMethods);
router.put('/site-config/payment-methods', updateAdminPaymentMethods);
router.get('/site-config/sliders', getAdminHomepageSliders);
router.put('/site-config/sliders', updateAdminHomepageSliders);
router.get('/site-config/social-links', getAdminSocialLinks);
router.put('/site-config/social-links', updateAdminSocialLinks);
router.get('/site-config/logo-icon', getAdminBranding);
router.put('/site-config/logo-icon', updateAdminBranding);

export default router;
