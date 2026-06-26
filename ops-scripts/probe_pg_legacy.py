import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
script = r'''
cd /www/wwwroot/jowabuzz/backend && node <<'NODE'
import 'dotenv/config';
import { connectDatabase } from './config/db.js';
import { getGamingGatewaySettingsInternal } from './services/gamingGatewayService.js';
import { getProviderByCode } from './services/oracleGamingApiService.js';
import { buildHmkLaunchQuery } from './services/hmkCryptoService.js';

await connectDatabase();
const settings = await getGamingGatewaySettingsInternal();
const base = process.env.HMK_API_URL.replace(/\/$/, '');
const token = process.env.HMK_TOKEN, secret = process.env.HMK_SECRET;

async function tryHmk(uid) {
  const p = { user_id:'1', balance:100, game_uid:String(uid), token, timestamp:Date.now(),
    return:process.env.HMK_RETURN_URL, callback:process.env.HMK_CALLBACK_URL,
    currency_code:'BDT', language:'en' };
  const q = buildHmkLaunchQuery(p, secret, token);
  const b = await (await fetch(`${base}?${q}`)).json();
  return { uid, ok: b?.code===0, msg: b?.msg };
}

const r = await getProviderByCode(settings, 'PG');
const targets = ['Fortune Tiger','Fortune Ox','Dragon Hatch'];
for (const g of r.games) {
  if (!targets.some(t => (g.name||'').includes(t))) continue;
  console.log('GAME', JSON.stringify({ name:g.name, legacy:g.legacyCode, code:g.code, uid:g.gameUid }));
  for (const u of [g.legacyCode, g.code, g.gameUid].filter(Boolean)) {
    const t = await tryHmk(u);
    console.log(' ', JSON.stringify(t));
    if (t.ok) break;
  }
}
NODE
'''
_, o, e = c.exec_command(script, timeout=120000)
print(o.read().decode('utf-8','replace'))
print(e.read().decode('utf-8','replace')[:400])
c.close()
