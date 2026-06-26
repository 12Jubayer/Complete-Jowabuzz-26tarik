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
import { getGamingGatewaySettingsInternal } from './services/gamingGatewayService.js';
import { getProviderByCode } from './services/oracleGamingApiService.js';
import { connectDatabase } from './config/db.js';
await connectDatabase();
const settings = await getGamingGatewaySettingsInternal();
const base = process.env.HMK_API_URL.replace(/\/$/, '');
const token = process.env.HMK_TOKEN, secret = process.env.HMK_SECRET;
async function tryHmk(uid) {
  const p = { user_id:'1', balance:100, game_uid:String(uid), token, timestamp:Date.now(),
    return:process.env.HMK_RETURN_URL, callback:process.env.HMK_CALLBACK_URL, currency_code:'BDT', language:'en' };
  const b = await (await fetch(`${base}?${buildHmkLaunchQuery(p,secret,token)}`)).json();
  return { uid: String(uid).slice(0,40), code: b?.code, msg: (b?.msg||'').slice(0,50) };
}
const r = await getProviderByCode(settings, 'JL');
const jili = (r.games||[]).find(g => /boxing/i.test(g.name||'')) || r.games[0];
console.log('JILI sample', JSON.stringify({name:jili?.name, code:jili?.code, legacy:jili?.legacyCode, uid:jili?.gameUid}));
for (const u of [jili?.legacyCode, jili?.code, jili?.gameUid, '77', 'JL'].filter(Boolean))
  console.log(' ', JSON.stringify(await tryHmk(u)));

const r2 = await getProviderByCode(settings, 'KA');
const ka = r2.games[0];
console.log('KA sample', JSON.stringify({name:ka?.name, code:ka?.code}));
for (const u of [ka?.code, ka?.legacyCode, ka?.gameUid, 'KA'].filter(Boolean))
  console.log(' ', JSON.stringify(await tryHmk(u)));
NODE
'''
_, o, _ = c.exec_command(script, timeout=180000)
print(o.read().decode('utf-8','replace'))
c.close()
