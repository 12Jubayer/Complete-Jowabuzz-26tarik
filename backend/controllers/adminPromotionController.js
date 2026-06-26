import {
  createPromotion,
  deletePromotion,
  listPromotionsAdmin,
  reorderPromotions,
  updatePromotion,
} from '../services/promotionsService.js';

export async function getAdminPromotions(req, res) {
  try {
    const result = await listPromotionsAdmin({
      search: req.query.search,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Get admin promotions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load promotions' });
  }
}

export async function createAdminPromotion(req, res) {
  try {
    const promotion = await createPromotion(req.body);
    return res.status(201).json({
      success: true,
      message: 'Promotion created successfully',
      data: promotion,
    });
  } catch (error) {
    console.error('Create admin promotion error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create promotion',
    });
  }
}

export async function updateAdminPromotion(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: 'Invalid promotion id' });
    }

    const promotion = await updatePromotion(id, req.body);
    return res.json({
      success: true,
      message: 'Promotion updated successfully',
      data: promotion,
    });
  } catch (error) {
    console.error('Update admin promotion error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update promotion',
    });
  }
}

export async function deleteAdminPromotion(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: 'Invalid promotion id' });
    }

    await deletePromotion(id);
    return res.json({
      success: true,
      message: 'Promotion deleted successfully',
    });
  } catch (error) {
    console.error('Delete admin promotion error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to delete promotion',
    });
  }
}

export async function reorderAdminPromotions(req, res) {
  try {
    const ids = req.body?.ids || req.body?.order || [];
    await reorderPromotions(ids);
    return res.json({
      success: true,
      message: 'Promotion order updated successfully',
    });
  } catch (error) {
    console.error('Reorder admin promotions error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to reorder promotions',
    });
  }
}

export default getAdminPromotions;
