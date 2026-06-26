import {
  bulkUpdateVipLevels,
  createVipLevel,
  deleteVipLevel,
  listAllVipLevels,
  updateVipLevel,
} from '../services/vipLevelService.js';

export async function getAdminVipLevels(req, res) {
  try {
    const data = await listAllVipLevels();
    return res.json({ data });
  } catch (error) {
    console.error('Get admin VIP levels error:', error);
    return res.status(500).json({ error: 'Failed to load VIP levels' });
  }
}

export async function createAdminVipLevel(req, res) {
  try {
    const data = await createVipLevel(req.body || {});
    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Create VIP level error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'VIP level number already exists' });
    }
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to create VIP level' });
  }
}

export async function updateAdminVipLevel(req, res) {
  try {
    const data = await updateVipLevel(Number(req.params.id), req.body || {});
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Update VIP level error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'VIP level number already exists' });
    }
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update VIP level' });
  }
}

export async function bulkUpdateAdminVipLevels(req, res) {
  try {
    const data = await bulkUpdateVipLevels(req.body?.levels || req.body || []);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Bulk update VIP levels error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to save VIP levels' });
  }
}

export async function deleteAdminVipLevel(req, res) {
  try {
    await deleteVipLevel(Number(req.params.id));
    return res.json({ success: true, message: 'VIP level deleted' });
  } catch (error) {
    console.error('Delete VIP level error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to delete VIP level' });
  }
}

export default getAdminVipLevels;
