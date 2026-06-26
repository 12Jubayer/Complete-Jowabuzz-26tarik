import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

script = r'''
cd /www/wwwroot/jowabuzz/backend && node <<'NODE'
import 'dotenv/config';
import { buildHmkLaunchQuery } from './services/hmkCryptoService.js';

const base = (process.env.HMK_API_URL || 'https://767fafapi.live/api/v1').replace(/\/$/, '');
const token = process.env.HMK_TOKEN;
const secret = process.env.HMK_SECRET;
const ts = Date.now();

const payloads = [
  { action: 'get_games' },
  { action: 'games' },
  { action: 'game_list' },
  { action: 'provider_games' },
  { action: 'get_providers' },
  { action: 'providers' },
  { type: 'game_list' },
  { type: 'provider_list' },
  { method: 'getGameList' },
  { method: 'getProviderList' },
  { cmd: 'game_list' },
  { request: 'game_list' },
  { username: process.env.HMK_USERNAME, action: 'game_list' },
  { merchant: process.env.HMK_USERNAME, action: 'list_games' },
  { provider_code: 'JILI', action: 'games' },
  { provider: 'JILI', action: 'list' },
];

async function tryPayload(payload) {
  const query = buildHmkLaunchQuery({ ...payload, token, timestamp: ts }, secret, token);
  const res = await fetch(`${base}?${query}`, { headers: { Accept: 'application/json' } });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 120) }; }
  const keys = body?.data && typeof body.data === 'object' ? Object.keys(body.data) : [];
  const arrLen = Array.isArray(body?.data) ? body.data.length : (Array.isArray(body?.data?.games) ? body.data.games.length : 0);
  return { payload, code: body?.code, msg: (body?.msg||'').slice(0,60), keys, arrLen, sample: JSON.stringify(body).slice(0, 200) };
}

for (const p of payloads) {
  const r = await tryPayload(p);
  if (r.arrLen > 0 || (r.code === 0 && r.keys.length > 2)) console.log('HIT', JSON.stringify(r));
  else console.log('MISS', JSON.stringify({ payload: r.payload, code: r.code, msg: r.msg }));
}

// try alternate base paths
for (const path of ['/games', '/providers', '/game/list', '/provider/list']) {
  try {
    const res = await fetch(`https://767fafapi.live/api/v1${path}`, { headers: { Accept: 'application/json' } });
    const t = await res.text();
    console.log('PATH', path, res.status, t.slice(0, 150));
  } catch (e) { console.log('PATH_ERR', path, e.message); }
}
NODE
'''
_, o, e = c.exec_command(script, timeout=120000)
print(o.read().decode('utf-8','replace'))
print(e.read().decode('utf-8','replace')[:500])
c.close()
