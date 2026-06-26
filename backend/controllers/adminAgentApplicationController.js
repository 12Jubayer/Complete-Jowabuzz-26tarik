import {
  deleteAgentApplication,
  getAgentApplicationById,
  listAgentApplications,
  updateAgentApplicationStatus,
} from '../services/agentApplicationService.js';

export async function listAdminAgentApplications(req, res) {
  try {
    const result = await listAgentApplications({
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      search: req.query.search,
    });
    return res.json(result);
  } catch (error) {
    console.error('List agent applications error:', error);
    return res.status(500).json({ error: 'Failed to load agent applications' });
  }
}

export async function getAdminAgentApplication(req, res) {
  try {
    const application = await getAgentApplicationById(req.params.id);
    return res.json(application);
  } catch (error) {
    console.error('Get agent application error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to load application',
    });
  }
}

export async function updateAdminAgentApplicationStatus(req, res) {
  try {
    const application = await updateAgentApplicationStatus(req.params.id, req.body.status);
    return res.json(application);
  } catch (error) {
    console.error('Update agent application status error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update application status',
    });
  }
}

export async function deleteAdminAgentApplication(req, res) {
  try {
    await deleteAgentApplication(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete agent application error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to delete application',
    });
  }
}
