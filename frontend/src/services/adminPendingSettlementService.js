import { approveAdminAgentCommissionSettlement, fetchAdminAgentCommissionSettlements } from './adminAgentCommissionService';
import { completeAdminSettlement, fetchAdminSettlements } from './adminAffiliateService';

export async function fetchPendingAgentSettlements() {
  const result = await fetchAdminAgentCommissionSettlements({ status: 'pending' });
  return result.settlements || [];
}

export async function fetchPendingAffiliateSettlements() {
  const result = await fetchAdminSettlements();
  return (result.settlements || []).filter(
    (row) => String(row.status || '').toLowerCase() === 'pending',
  );
}

export async function approvePendingAgentSettlement(settlementId) {
  return approveAdminAgentCommissionSettlement(settlementId);
}

export async function approvePendingAffiliateSettlement(settlementId, source = 'period') {
  return completeAdminSettlement(settlementId, source);
}

export default {
  fetchPendingAgentSettlements,
  fetchPendingAffiliateSettlements,
  approvePendingAgentSettlement,
  approvePendingAffiliateSettlement,
};
