import { getPool } from '../config/db.js';
import { getAffiliateSettings } from '../services/affiliateService.js';
import {
  getSettlementWindowForSettings,
  shouldGenerateSettlementNow,
} from '../services/affiliateSettlementBarService.js';
import {
  ensureSettlementPeriodForWindow,
  runSettlementForPeriodWindow,
} from '../services/affiliateSettlementPeriodService.js';

let lastCronKey = null;

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function runScheduledAffiliateSettlement(referenceDate = new Date()) {
  const settings = await getAffiliateSettings();
  const now = new Date(referenceDate);

  if (!shouldGenerateSettlementNow(settings, now)) {
    return { skipped: true, reason: 'Settlement not ready for auto pending' };
  }

  const window = getSettlementWindowForSettings(settings, now);
  const pool = getPool();
  const [[existingRun]] = await pool.query(
    `SELECT id FROM affiliate_settlement_cron_log
     WHERE run_date = ? AND period_start = ? AND period_end = ?
     LIMIT 1`,
    [formatDate(now), window.startDate, window.endDate],
  );

  if (existingRun) {
    return { skipped: true, reason: 'Cron already ran for this period' };
  }

  const periodId = await ensureSettlementPeriodForWindow(window);
  const result = await runSettlementForPeriodWindow(periodId, window);

  await pool.query(
    `INSERT INTO affiliate_settlement_cron_log (run_date, period_start, period_end, affiliates_processed)
     VALUES (?, ?, ?, ?)`,
    [formatDate(now), window.startDate, window.endDate, result.results?.length || 0],
  );

  return { success: true, window, ...result };
}

export function startAffiliateSettlementCron() {
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() !== 0 || now.getMinutes() !== 5) return;
    const cronKey = `${formatDate(now)}-00:05`;
    if (lastCronKey === cronKey) return;

    try {
      const result = await runScheduledAffiliateSettlement(now);
      lastCronKey = cronKey;
      if (!result.skipped) {
        console.log(
          '[AffiliateSettlementCron] completed',
          result.window?.settlementType,
          result.window?.startDate,
          result.window?.endDate,
        );
      }
    } catch (error) {
      console.error('[AffiliateSettlementCron] failed:', error.message);
    }
  }, 60 * 1000);

  console.log('[AffiliateSettlementCron] scheduler started (checks daily at 00:05 server time)');
}
