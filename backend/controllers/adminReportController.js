import { getAdminReport } from '../services/adminReportService.js';

export async function listAdminReports(req, res) {
  try {
    const report = await getAdminReport(req.query);
    return res.json(report);
  } catch (error) {
    console.error('List admin reports error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to fetch report data',
    });
  }
}

export default listAdminReports;
