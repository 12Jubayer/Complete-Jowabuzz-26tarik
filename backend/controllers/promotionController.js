import { listActivePromotions } from '../services/promotionsService.js';

export async function getPublicPromotions(req, res) {
  try {
    const promotions = await listActivePromotions();
    return res.json({
      success: true,
      data: promotions,
    });
  } catch (error) {
    console.error('Get public promotions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load promotions' });
  }
}

export default getPublicPromotions;
