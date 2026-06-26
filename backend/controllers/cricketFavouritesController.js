import { listCricketFavouriteMatches } from '../services/cricketFavouritesService.js';

export async function getPublicCricketFavourites(req, res) {
  try {
    const { source, matches } = await listCricketFavouriteMatches();
    return res.json({
      success: true,
      source,
      data: matches,
    });
  } catch (error) {
    console.error('Get public cricket favourites error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load cricket favourites',
    });
  }
}

export default getPublicCricketFavourites;
