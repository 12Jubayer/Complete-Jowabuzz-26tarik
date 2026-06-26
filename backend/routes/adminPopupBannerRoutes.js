import { Router } from 'express';
import {
  deleteAdminPopupBanner,
  getAdminPopupBanners,
  postAdminPopupBanner,
  putAdminPopupBanner,
} from '../controllers/popupBannerController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/popup-banners', getAdminPopupBanners);
router.post('/popup-banners', postAdminPopupBanner);
router.put('/popup-banners/:id', putAdminPopupBanner);
router.delete('/popup-banners/:id', deleteAdminPopupBanner);

export default router;
