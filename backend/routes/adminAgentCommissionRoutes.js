import { Router } from 'express';
import {
  getAdminAgentCommissionAgents,
  getAdminAgentCommissionExportCsv,
  getAdminAgentCommissionExportPdf,
  getAdminAgentCommissionSettings,
  getAdminAgentCommissionSettlementDetails,
  getAdminAgentCommissionSettlements,
  getAdminAgentCommissionSummary,
  getAdminAgentCommissionTransactions,
  postAdminAgentCommissionSettlementApprove,
  postAdminAgentCommissionSettlementReject,
  postAdminAgentCommissionSettlementsGenerate,
  putAdminAgentCommissionSettings,
} from '../controllers/agentCommissionController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.get('/agent-commission/summary', getAdminAgentCommissionSummary);
router.get('/agent-commission/agents', getAdminAgentCommissionAgents);
router.get('/agent-commission/transactions', getAdminAgentCommissionTransactions);
router.get('/agent-commission/settings', getAdminAgentCommissionSettings);
router.put('/agent-commission/settings', putAdminAgentCommissionSettings);
router.get('/agent-commission/export/csv', getAdminAgentCommissionExportCsv);
router.get('/agent-commission/export/pdf', getAdminAgentCommissionExportPdf);
router.get('/agent-commission/settlements', getAdminAgentCommissionSettlements);
router.post('/agent-commission/settlements/generate', postAdminAgentCommissionSettlementsGenerate);
router.get('/agent-commission/settlements/:id', getAdminAgentCommissionSettlementDetails);
router.post('/agent-commission/settlements/:id/approve', postAdminAgentCommissionSettlementApprove);
router.post('/agent-commission/settlements/:id/reject', postAdminAgentCommissionSettlementReject);

export default router;
