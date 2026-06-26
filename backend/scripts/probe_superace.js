import 'dotenv/config';
import { connectDatabase } from '../config/db.js';
import { buildHmkLaunchQuery } from '../services/hmkCryptoService.js';
import { getGamingGatewaySettingsInternal } from '../services/gamingGatewayService.js';
import { getProviderByCode } from '../services/oracleGamingApiService.js';

await connectDatabase();

const base = (process.env.HMK_API_URL || 'https://767fafapi.live/api/v1').replace(/\/$/, '');
const token = process.env.HMK_TOKEN;
const secret = process.env.HMK_SECRET;

async function tryLaunch(gameUid) {
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
  };
  const query = buildHmkLaunchQuery(payload, secret, token);
  const res = await fetch(`${base}?${query}`, { headers: { Accept: 'application/json' } });
  const body = await res.json();
  return { gameUid, code: body?.code, msg: body?.msg };
}

const settings = await getGamingGatewaySettingsInternal();
const jili = await getProviderByCode(settings, 'JILI');
const rawGames = Array.isArray(jili.raw) ? jili.raw : [];

const targets = ['Super Ace 2', 'Super Ace', '12 Zodiacs', 'Aviator', 'Twist'];
for (const name of targets) {
  const norm = (jili.games || []).find((g) => g.name.toLowerCase().includes(name.toLowerCase()));
  const raw = rawGames.find((g) =>
    String(g.game_name || g.gameName || g.name || '').toLowerCase().includes(name.toLowerCase()),
  );
  console.log('\n===', name, '===');
  console.log('NORM', JSON.stringify(norm));
  console.log('RAW', JSON.stringify(raw));

  const tests = new Set();
  if (norm) {
    [norm.legacyCode, norm.code, norm.gameUid].forEach((v) => v && tests.add(String(v)));
  }
  if (raw) {
    Object.values(raw).forEach((v) => {
      if (v !== null && v !== undefined && String(v).length < 36) tests.add(String(v));
    });
  }

  for (const uid of tests) {
    const r = await tryLaunch(uid);
    const mark = r.code === 0 ? 'OK' : 'NO';
    console.log(mark, uid, r.msg?.slice(0, 60));
  }
}

process.exit(0);
