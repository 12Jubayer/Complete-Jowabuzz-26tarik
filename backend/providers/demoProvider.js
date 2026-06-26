import { BaseProvider } from './baseProvider.js';

export class DemoProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.adapterKey = 'demo';
  }

  async startSession({ user, game, sessionToken }) {
    return {
      launchUrl: null,
      sessionToken,
      demo: true,
      message: `Demo session started for ${game.name}`,
      minBet: Number(game.min_bet || 10),
    };
  }

  async resolveRoundResult({ betAmount, balance, roundId, providerPayload = {} }) {
    const bet = Number(betAmount);
    if (!bet || bet <= 0) {
      throw new Error('Invalid bet amount');
    }

    if (bet > Number(balance)) {
      throw new Error('Insufficient balance');
    }

    if (providerPayload?.winAmount !== undefined && providerPayload?.mode === 'fixed') {
      const winAmount = Math.max(0, Number(providerPayload.winAmount));
      return {
        betAmount: bet,
        winAmount,
        netAmount: winAmount - bet,
        roundId,
        demo: true,
      };
    }

    const roll = Math.random();
    let winAmount = 0;

    if (roll > 0.55) {
      winAmount = Number((bet * (1 + Math.random() * 2)).toFixed(2));
    } else if (roll > 0.35) {
      winAmount = bet;
    }

    return {
      betAmount: bet,
      winAmount,
      netAmount: Number((winAmount - bet).toFixed(2)),
      roundId,
      demo: true,
    };
  }
}

export default new DemoProvider();
