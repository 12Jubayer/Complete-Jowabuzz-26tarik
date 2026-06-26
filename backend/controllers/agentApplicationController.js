import { createAgentApplication } from '../services/agentApplicationService.js';

export async function submitAgentApplication(req, res) {
  try {
    const application = await createAgentApplication(req.body);
    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully. Our team will contact you soon.',
      application,
    });
  } catch (error) {
    console.error('Submit agent application error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to submit application',
    });
  }
}
