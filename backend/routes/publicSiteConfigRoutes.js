import { Router } from 'express';
import { getPublicNoticeConfig, getPublicPaymentMethods, getPublicSocialLinks, getPublicBranding } from '../controllers/siteConfigController.js';
import { getPublicAppDownload } from '../controllers/appDownloadController.js';
import {
  getPublicGeneralChatSettings,
  getPublicGeneralDepositWithdrawSettings,
  getPublicGeneralPaymentGatewaySettings,
} from '../controllers/generalSettingsController.js';
import { getPublicGamingGatewaySettings } from '../controllers/gamingApiSettingsController.js';

const router = Router();

router.get('/site-config/notice', getPublicNoticeConfig);
router.get('/site-config/payment-methods', getPublicPaymentMethods);
router.get('/site-config/social-links', getPublicSocialLinks);
router.get('/site-config/branding', getPublicBranding);
router.get('/site-config/app-download', getPublicAppDownload);
router.get('/site-config/chat', getPublicGeneralChatSettings);
router.get('/site-config/deposit-withdraw-rules', getPublicGeneralDepositWithdrawSettings);
router.get('/site-config/payment-gateway', getPublicGeneralPaymentGatewaySettings);
router.get('/site-config/gaming-gateway', getPublicGamingGatewaySettings);

export default router;
