import {
  listAdminGameImages,
  removeAdminGameCustomImage,
  updateAdminGameImage,
} from '../services/adminGameImageService.js';

export async function getAdminGameImages(req, res) {
  try {
    const result = await listAdminGameImages({
      providerId: req.query.providerId || req.query.provider_id || '',
      imageStatus: req.query.imageStatus || req.query.image_status || 'all',
      search: req.query.search || '',
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.json(result);
  } catch (error) {
    console.error('Get admin game images error:', error);
    return res.status(500).json({ error: 'Failed to load game images' });
  }
}

export async function updateAdminGameImageHandler(req, res) {
  try {
    const customImageUrl = req.body.customImageUrl ?? req.body.custom_image_url ?? req.body.imageUrl;
    const data = await updateAdminGameImage(Number(req.params.gameId), customImageUrl);
    return res.json({ success: true, data, message: 'Game image updated' });
  } catch (error) {
    console.error('Update admin game image error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update game image' });
  }
}

export async function deleteAdminGameImageHandler(req, res) {
  try {
    const data = await removeAdminGameCustomImage(Number(req.params.gameId));
    return res.json({ success: true, data, message: 'Custom image removed' });
  } catch (error) {
    console.error('Delete admin game image error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to remove custom image' });
  }
}

export default getAdminGameImages;
