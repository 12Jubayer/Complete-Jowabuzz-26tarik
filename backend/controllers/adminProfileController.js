import {
  getAdminIdFromRequest,
  getAdminProfile,
  updateAdminProfile,
  updateAdminProfilePassword,
} from '../services/adminProfileService.js';

export async function getProfile(req, res) {
  const adminId = getAdminIdFromRequest(req);

  if (!adminId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const profile = await getAdminProfile(adminId);
    return res.json({ data: profile });
  } catch (error) {
    console.error('Get admin profile error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to load profile',
    });
  }
}

export async function putProfile(req, res) {
  const adminId = getAdminIdFromRequest(req);

  if (!adminId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const profile = await updateAdminProfile(adminId, req.body.name);
    return res.json({
      message: 'Profile updated successfully',
      data: profile,
    });
  } catch (error) {
    console.error('Update admin profile error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update profile',
    });
  }
}

export async function putProfilePassword(req, res) {
  const adminId = getAdminIdFromRequest(req);

  if (!adminId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await updateAdminProfilePassword(
      adminId,
      req.body.password || req.body.newPassword,
    );

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update admin profile password error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update password',
    });
  }
}

export default {
  getProfile,
  putProfile,
  putProfilePassword,
};
