import { getPool } from '../config/db.js';
import {
  getSettlementWindowForSettings,
  shouldGenerateSettlementNow,
} from '../services/agentSettlementBarService.js';
import {
  generateAgentCommissionSettlements,
  getAgentSettlementSettings,
  windowToSqlRange,
} from '../services/agentCommissionSettlementService.js';

let lastCronKey = null;

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function runScheduledAgentCommissionSettlement(referenceDate = new Date()) {
  const settings = await getAgentSettlementSettings();
  const now = new Date(referenceDate);

  if (!shouldGenerateSettlementNow(settings, now)) {
    return { skipped: true, reason: 'Agent settlement not ready for auto pending' };
  }

  const window = getSettlementWindowForSettings(settings, now);
  const { periodStartSql, periodEndSql } = windowToSqlRange(window);
  const pool = getPool();

  const [[existingRun]] = await pool.query(
    `SELECT id FROM agent_settlement_cron_log
     WHERE run_date = ? AND period_start = ? AND period_end = ?
     LIMIT 1`,
    [formatDate(now), periodStartSql, periodEndSql],
  );

  if (existingRun) {
    return { skipped: true, reason: 'Cron already ran for this period' };
  }

  const result = await generateAgentCommissionSettlements({ window, mode: 'closed' });

  await pool.query(
    `INSERT INTO agent_settlement_cron_log (run_date, period_start, period_end, agents_processed)
     VALUES (?, ?, ?, ?)`,
    [formatDate(now), periodStartSql, periodEndSql, result.created || 0],
  );

  return { success: true, window, ...result };
}

export function startAgentCommissionSettlementScheduler() {
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() !== 0 || now.getMinutes() !== 5) return;
    const cronKey = `${formatDate(now)}-00:05`;
    if (lastCronKey === cronKey) return;

    try {
      const result = await runScheduledAgentCommissionSettlement(now);
      lastCronKey = cronKey;
      if (!result.skipped && result.created > 0) {
        console.log(
          '[AgentSettlementCron] completed',
          result.window?.settlementType,
          result.window?.startDate,
          result.window?.endDate,
          result.created,
        );
      }
    } catch (error) {
      console.error('[AgentSettlementCron] failed:', error.message);
    }
  }, 60 * 1000);

  console.log('[AgentSettlementCron] scheduler started (checks daily at 00:05 server time)');
}
