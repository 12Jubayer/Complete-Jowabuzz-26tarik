import {
  createAdminNotification,
  getNotificationAudienceCounts,
  listAdminNotifications,
} from '../services/notificationService.js';

export async function getAdminNotifications(req, res) {
  try {
    const result = await listAdminNotifications({
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.json(result);
  } catch (error) {
    console.error('Get admin notifications error:', error);
    return res.status(500).json({ error: 'Failed to load notifications' });
  }
}

export async function getAdminNotificationAudienceCounts(req, res) {
  try {
    const audienceCounts = await getNotificationAudienceCounts();
    return res.json({ audienceCounts });
  } catch (error) {
    console.error('Get audience counts error:', error);
    return res.status(500).json({ error: 'Failed to load audience counts' });
  }
}

export async function postAdminNotification(req, res) {
  try {
    const audienceMode = String(req.body.audienceMode || req.body.audience_type || 'all');
    const data = await createAdminNotification({
      title: req.body.title,
      message: req.body.message,
      audienceMode,
      targetRole: req.body.targetRole || req.body.target_role,
    });

    return res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
      data,
    });
  } catch (error) {
    console.error('Post admin notification error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to send notification',
    });
  }
}

export default getAdminNotifications;
