import { Router } from 'express';
import { getPublicHomepageSliders } from '../controllers/siteConfigController.js';
import { getSitePopupBanners } from '../controllers/popupBannerController.js';
import { getSiteActiveBonusTurnover } from '../controllers/bonusTurnoverController.js';
import { getSiteActiveDepositBonusRules } from '../controllers/depositBonusController.js';

const router = Router();

router.get('/site/sliders', getPublicHomepageSliders);
router.get('/site/popup-banners', getSitePopupBanners);
router.get('/site/active-bonus-turnover', getSiteActiveBonusTurnover);
router.get('/site/active-deposit-bonus', getSiteActiveDepositBonusRules);

export default router;
