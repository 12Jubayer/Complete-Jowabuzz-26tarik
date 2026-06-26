import { Router } from 'express';
import { getPublicCricketFavourites } from '../controllers/cricketFavouritesController.js';
import { getPublicFavouriteSliders } from '../controllers/favouriteSliderController.js';

const router = Router();

router.get('/cricket-favourites', getPublicCricketFavourites);
router.get('/favourite-sliders', getPublicFavouriteSliders);

export default router;
