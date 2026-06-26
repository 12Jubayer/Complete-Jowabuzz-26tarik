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
const base = process.env.HMK_API_URL.replace(/\/$/, '');
const token = process.env.HMK_TOKEN, secret = process.env.HMK_SECRET;
async function tryHmk(uid) {
  const p = { user_id:'1', balance:100, game_uid:String(uid), token, timestamp:Date.now(),
    return:process.env.HMK_RETURN_URL, callback:process.env.HMK_CALLBACK_URL, currency_code:'BDT', language:'en' };
  const b = await (await fetch(`${base}?${buildHmkLaunchQuery(p,secret,token)}`)).json();
  return { uid: String(uid).slice(0,40), code: b?.code, msg: (b?.msg||'').slice(0,80), url: !!(b?.data?.url) };
}
const tests = [
  '9a8482565ce343ad3ea7fc4bc42cb043', // Fortune Tiger hex
  '1189baca156e1bbbecc3b26651a63565', // Mahjong Ways
  '126', '98', '74', '57', '87', '135', 'PG', 'fortune-tiger',
];
for (const u of tests) console.log(JSON.stringify(await tryHmk(u)));
NODE
'''
_, o, _ = c.exec_command(script, timeout=60000)
print(o.read().decode('utf-8','replace'))
c.close()
