import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { buildHmkLaunchQuery } from '../services/hmkCryptoService.js';
import { getGamingGatewaySettingsInternal } from '../services/gamingGatewayService.js';

await connectDatabase();
const base = (process.env.HMK_API_URL || 'https://767fafapi.live/api/v1').replace(/\/$/, '');
const token = process.env.HMK_TOKEN;
const secret = process.env.HMK_SECRET;

async function tryHmk(gameUid, extra = {}) {
  const payload = {
    user_id: '1',
    balance: 100,
    game_uid: String(gameUid),
    token,
    timestamp: Date.now(),
    return: process.env.HMK_RETURN_URL || 'https://jowabuzz.com/game/return',
    callback: process.env.HMK_CALLBACK_URL || 'https://jowabuzz.com/api/hmk/callback',
    currency_code: process.env.HMK_CURRENCY || 'BDT',
    language: 'en',
    ...extra,
  };
  const query = buildHmkLaunchQuery(payload, secret, token);
  const res = await fetch(`${base}?${query}`, { headers: { Accept: 'application/json' } });
  const body = await res.json();
  return { uid: gameUid, extra, code: body?.code, ok: body?.code === 0, msg: body?.msg, url: (body?.data?.url || '').slice(0, 120) };
}

// Oracle launch with hex game code
const settings = await getGamingGatewaySettingsInternal();
const { launchOracleGameSession } = await import('../services/gamingGatewayService.js');
const hex = '48341a3bf62b6dd0814d7129e7e0834b';

for (const gameCode of [hex, '48341a3bf62b6dd0814d7129e7e0834b', '9Wicket', '9WICKET']) {
  try {
    const r = await launchOracleGameSession({
      user: { id: 1, username: 'test' },
      game: { id: 6020, code: gameCode, name: '9Wicket', provider_code: '9W', category: 'sports', game_type: 'SPORTS' },
      launchBalance: 100,
    });
    console.log('ORACLE_OK', gameCode, JSON.stringify(r).slice(0, 200));
    break;
  } catch (e) {
    console.log('ORACLE_FAIL', gameCode, e.message);
  }
}

// HMK with extra params
for (const extra of [
  {},
  { provider_code: '9W' },
  { provider: '9W' },
  { game_code: hex },
  { language: 'bn' },
]) {
  const r = await tryHmk(hex, extra);
  console.log('HMK', JSON.stringify(r));
  if (r.ok) break;
}

process.exit(0);
