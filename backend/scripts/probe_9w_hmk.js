import 'dotenv/config';
import { buildHmkLaunchQuery } from '../services/hmkCryptoService.js';

const base = (process.env.HMK_API_URL || 'https://767fafapi.live/api/v1').replace(/\/$/, '');
const token = process.env.HMK_TOKEN;
const secret = process.env.HMK_SECRET;
const uid = '48341a3bf62b6dd0814d7129e7e0834b';

const payload = {
  user_id: '1', balance: 100, game_uid: uid, token, timestamp: Date.now(),
  return: process.env.HMK_RETURN_URL || 'https://jowabuzz.com/game/return',
  callback: process.env.HMK_CALLBACK_URL || 'https://jowabuzz.com/api/hmk/callback',
  currency_code: 'BDT', language: 'en',
};
const query = buildHmkLaunchQuery(payload, secret, token);
const res = await fetch(`${base}?${query}`, { headers: { Accept: 'application/json' } });
const body = await res.json();
console.log(JSON.stringify({ code: body?.code, msg: body?.msg, url: body?.data?.url }));
process.exit(0);
