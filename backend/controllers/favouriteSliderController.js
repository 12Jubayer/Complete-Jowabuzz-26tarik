import {
  createFavouriteSlider,
  deleteFavouriteSlider,
  listActiveFavouriteSliders,
  listAllFavouriteSliders,
  updateFavouriteSlider,
} from '../services/favouriteSlidersService.js';

export async function getAdminFavouriteSliders(req, res) {
  try {
    const sliders = await listAllFavouriteSliders();
    return res.json({ success: true, data: sliders });
  } catch (error) {
    console.error('Get admin favourite sliders error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load favourite sliders' });
  }
}

export async function postAdminFavouriteSlider(req, res) {
  try {
    const slider = await createFavouriteSlider(req.body);
    return res.status(201).json({
      success: true,
      message: 'Favourite slider created successfully',
      data: slider,
    });
  } catch (error) {
    console.error('Create admin favourite slider error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create favourite slider',
    });
  }
}

export async function putAdminFavouriteSlider(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: 'Invalid favourite slider id' });
    }

    const slider = await updateFavouriteSlider(id, req.body);
    return res.json({
      success: true,
      message: 'Favourite slider updated successfully',
      data: slider,
    });
  } catch (error) {
    console.error('Update admin favourite slider error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update favourite slider',
    });
  }
}

export async function deleteAdminFavouriteSlider(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: 'Invalid favourite slider id' });
    }

    await deleteFavouriteSlider(id);
    return res.json({
      success: true,
      message: 'Favourite slider deleted successfully',
    });
  } catch (error) {
    console.error('Delete admin favourite slider error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to delete favourite slider',
    });
  }
}

export async function getPublicFavouriteSliders(req, res) {
  try {
    const sliders = await listActiveFavouriteSliders();
    return res.json({ success: true, data: sliders });
  } catch (error) {
    console.error('Get public favourite sliders error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load favourite sliders' });
  }
}

export default {
  getAdminFavouriteSliders,
  postAdminFavouriteSlider,
  putAdminFavouriteSlider,
  deleteAdminFavouriteSlider,
  getPublicFavouriteSliders,
};
