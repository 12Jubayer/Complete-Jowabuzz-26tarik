import {
  getCompletedWeekRange,
  getWeeklyCashbackSettings,
  runScheduledWeeklyCashback,
  shouldRunWeeklyCashbackNow,
} from '../services/weeklyCashbackService.js';

let lastCronKey = null;

export async function runWeeklyCashbackCronTick(referenceDate = new Date()) {
  const settings = await getWeeklyCashbackSettings();
  const now = new Date(referenceDate);

  if (!shouldRunWeeklyCashbackNow(settings, now)) {
    return { skipped: true, reason: 'Not scheduled time' };
  }

  const { weekEnd } = getCompletedWeekRange(settings.dayOfWeek, settings.hourUtc, now);
  const cronKey = weekEnd.toISOString();

  if (lastCronKey === cronKey) {
    return { skipped: true, reason: 'Already triggered this period' };
  }

  const result = await runScheduledWeeklyCashback(now);

  if (!result.alreadyRan) {
    lastCronKey = cronKey;
  }

  return result;
}

export function startWeeklyCashbackCron() {
  setInterval(async () => {
    try {
      const result = await runWeeklyCashbackCronTick(new Date());
      if (!result.skipped && !result.alreadyRan) {
        console.log(
          '[WeeklyCashbackCron] completed',
          `credited ${result.credited}`,
          `skipped ${result.skipped}`,
          result.weekStartLabel,
          result.weekEndLabel,
        );
      }
    } catch (error) {
      console.error('[WeeklyCashbackCron] failed:', error.message);
    }
  }, 60 * 1000);

  console.log('[WeeklyCashbackCron] scheduler started (checks every minute for configured UTC day/hour)');
}

export default startWeeklyCashbackCron;
