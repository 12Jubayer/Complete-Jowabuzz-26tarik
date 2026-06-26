import 'dotenv/config';
import { buildHmkLaunchQuery } from '../services/hmkCryptoService.js';

const base = (process.env.HMK_API_URL || 'https://767fafapi.live/api/v1').replace(/\/$/, '');
const token = process.env.HMK_TOKEN;
const secret = process.env.HMK_SECRET;

const payloads = [
  { action: 'game_list' },
  { action: 'list' },
  { action: 'provider_list' },
  { method: 'game_list' },
  { provider_code: 'JILI' },
  { provider: 'JILI' },
  { code: 'JILI' },
];

for (const payload of payloads) {
  const query = buildHmkLaunchQuery({ ...payload, token, timestamp: Date.now() }, secret, token);
  const url = `${base}?${query}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const body = await res.json();
    console.log('PAYLOAD', JSON.stringify(payload));
    console.log('RESPONSE', JSON.stringify(body).slice(0, 500));
    console.log('---');
  } catch (error) {
    console.log('PAYLOAD', JSON.stringify(payload), 'ERR', error.message);
  }
}

// test known working uid
const launchPayload = {
  user_id: '1',
  balance: 100,
  game_uid: '3978',
  token,
  timestamp: Date.now(),
  return: process.env.HMK_RETURN_URL || 'https://jowabuzz.com/game/return',
  callback: process.env.HMK_CALLBACK_URL || 'https://jowabuzz.com/api/hmk/callback',
  currency_code: process.env.HMK_CURRENCY || 'BDT',
  language: 'en',
};
const launchQuery = buildHmkLaunchQuery(launchPayload, secret, token);
const launchRes = await fetch(`${base}?${launchQuery}`, { headers: { Accept: 'application/json' } });
const launchBody = await launchRes.json();
console.log('LAUNCH_3978', JSON.stringify(launchBody).slice(0, 300));
