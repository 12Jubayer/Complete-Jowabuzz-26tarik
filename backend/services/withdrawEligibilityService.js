import { getWithdrawTurnoverSettings } from './generalSettingsService.js';
import { isTurnoverComplete, resolveEffectiveTurnover } from './userWalletService.js';
import { hasLockedBonusProgress } from './bonusUserProgressService.js';
import { getUserDepositBonusStatus, hasLockedDepositBonus } from './depositBonusService.js';

export async function enforceTurnoverForWithdraw(wallet, options = {}) {
  const flags = await getWithdrawTurnoverSettings();
  if (!flags.requireTurnoverForWithdraw) return;

  let effectiveWallet = wallet;
  if (options.userId) {
    const depositBonusSummary = await getUserDepositBonusStatus(options.userId);
    const turnover = resolveEffectiveTurnover(wallet, depositBonusSummary.primaryProgress);
    effectiveWallet = {
      required_turnover: turnover.requiredTurnover,
      completed_turnover: turnover.completedTurnover,
    };
  }

  if (!isTurnoverComplete(effectiveWallet)) {
    const error = new Error('Turnover incomplete');
    error.statusCode = 400;
    throw error;
  }
}

export async function enforceBonusTurnoverForWithdraw(userId, connection) {
  const flags = await getWithdrawTurnoverSettings();
  if (!flags.requireBonusTurnoverForWithdraw) return;

  if (await hasLockedDepositBonus(userId, connection)) {
    const error = new Error(
      'Bonus turnover incomplete. Complete your deposit bonus turnover before withdrawing.',
    );
    error.statusCode = 400;
    throw error;
  }

  if (await hasLockedBonusProgress(userId, connection)) {
    const error = new Error('Bonus turnover incomplete. Complete your bonus turnover before withdrawing.');
    error.statusCode = 400;
    throw error;
  }
}

export default {
  enforceTurnoverForWithdraw,
  enforceBonusTurnoverForWithdraw,
};
