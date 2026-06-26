import {
  createPopupBanner,
  deletePopupBanner,
  listAllPopupBanners,
  listActivePopupBanners,
  updatePopupBanner,
} from '../services/popupBannerService.js';

export async function getAdminPopupBanners(req, res) {
  try {
    const banners = await listAllPopupBanners();
    return res.json({ success: true, data: banners });
  } catch (error) {
    console.error('Get admin popup banners error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load popup banners' });
  }
}

export async function postAdminPopupBanner(req, res) {
  try {
    const banner = await createPopupBanner(req.body);
    return res.status(201).json({
      success: true,
      message: 'Popup banner created successfully',
      data: banner,
    });
  } catch (error) {
    console.error('Create admin popup banner error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create popup banner',
    });
  }
}

export async function putAdminPopupBanner(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: 'Invalid popup banner id' });
    }

    const banner = await updatePopupBanner(id, req.body);
    return res.json({
      success: true,
      message: 'Popup banner updated successfully',
      data: banner,
    });
  } catch (error) {
    console.error('Update admin popup banner error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update popup banner',
    });
  }
}

export async function deleteAdminPopupBanner(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: 'Invalid popup banner id' });
    }

    await deletePopupBanner(id);
    return res.json({
      success: true,
      message: 'Popup banner deleted successfully',
    });
  } catch (error) {
    console.error('Delete admin popup banner error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to delete popup banner',
    });
  }
}

export async function getSitePopupBanners(req, res) {
  try {
    const banners = await listActivePopupBanners();
    return res.json({ success: true, data: banners });
  } catch (error) {
    console.error('Get site popup banners error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load popup banners' });
  }
}

export default {
  getAdminPopupBanners,
  postAdminPopupBanner,
  putAdminPopupBanner,
  deleteAdminPopupBanner,
  getSitePopupBanners,
};
