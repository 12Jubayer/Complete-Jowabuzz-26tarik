import { Router } from 'express';
import {
  deleteAdminFavouriteSlider,
  getAdminFavouriteSliders,
  postAdminFavouriteSlider,
  putAdminFavouriteSlider,
} from '../controllers/favouriteSliderController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/favourite-sliders', getAdminFavouriteSliders);
router.post('/favourite-sliders', postAdminFavouriteSlider);
router.put('/favourite-sliders/:id', putAdminFavouriteSlider);
router.delete('/favourite-sliders/:id', deleteAdminFavouriteSlider);

export default router;
