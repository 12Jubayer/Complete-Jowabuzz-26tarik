export class BaseProvider {
  constructor(config = {}) {
    this.config = config;
    this.adapterKey = 'base';
  }

  async startSession({ user, game, sessionToken }) {
    return {
      launchUrl: null,
      sessionToken,
      demo: true,
    };
  }

  async resolveRoundResult({ betAmount, balance, roundId, providerPayload = {} }) {
    throw new Error('resolveRoundResult must be implemented by provider adapter');
  }

  verifyWebhookSignature() {
    return true;
  }
}

export default BaseProvider;
