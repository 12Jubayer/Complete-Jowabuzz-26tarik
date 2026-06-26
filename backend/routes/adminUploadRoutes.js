import { Router } from 'express';
import {
  uploadFavicon,
  uploadGameImage,
  uploadLogo,
  uploadPromotionImage,
  uploadSliderImage,
} from '../controllers/adminUploadController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import { faviconUpload, logoUpload } from '../middleware/brandingImageUpload.js';
import { gameImageUpload } from '../middleware/gameImageUpload.js';
import { promotionImageUpload } from '../middleware/promotionImageUpload.js';
import { sliderImageUpload } from '../middleware/sliderImageUpload.js';

const router = Router();

router.use(requireAdminAuth);

function handleUpload(uploadMiddleware, maxSizeMessage) {
  return (req, res, next) => {
    uploadMiddleware.single('image')(req, res, (error) => {
      if (error) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: maxSizeMessage });
        }
        return res.status(400).json({ error: error.message || 'Invalid image upload' });
      }
      return next();
    });
  };
}

router.post(
  '/upload/slider-image',
  handleUpload(sliderImageUpload, 'Image must be 5MB or smaller'),
  uploadSliderImage,
);

router.post(
  '/upload/logo',
  handleUpload(logoUpload, 'Logo must be 2MB or smaller'),
  uploadLogo,
);

router.post(
  '/upload/favicon',
  handleUpload(faviconUpload, 'Favicon must be 2MB or smaller'),
  uploadFavicon,
);

router.post(
  '/upload/promotion-image',
  handleUpload(promotionImageUpload, 'Image must be 5MB or smaller'),
  uploadPromotionImage,
);

router.post(
  '/upload/game-image',
  handleUpload(gameImageUpload, 'Image must be 5MB or smaller'),
  uploadGameImage,
);

export default router;
