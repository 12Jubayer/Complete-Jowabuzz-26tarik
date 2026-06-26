#!/usr/bin/env python3
"""Deploy launch fix and test V2 fallback launch."""
import paramiko, sys, json
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
root = Path(__file__).resolve().parent.parent
files = [
    'backend/services/oracleGamesApiClient.js',
    'backend/services/gamingGatewayService.js',
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()
for rel in files:
    sftp.put(str(root / rel), f'/www/wwwroot/jowabuzz/{rel}')
sftp.close()

patch = r'''
ENV=/www/wwwroot/jowabuzz/backend/.env
grep -q '^ORACLE_GAMES_V3_LAUNCH_FALLBACK=' "$ENV" || echo 'ORACLE_GAMES_V3_LAUNCH_FALLBACK=v2' >> "$ENV"
pm2 restart jowabuzz
sleep 5
cd /www/wwwroot/jowabuzz/backend
node --input-type=module <<'NODE'
import { launchOracleGame, mergeOracleCredentials } from './services/oracleGamesApiClient.js';
import { getGamingGatewaySettingsInternal } from './services/gamingGatewayService.js';
import { connectDatabase } from './config/db.js';

await connectDatabase();
const settings = await getGamingGatewaySettingsInternal();
const body = {
  username: '01700000000',
  money: 100,
  game_code: '77',
  provider_code: 'JILIS',
  game_type: 'SLOT',
  callback_url: 'https://jowabuzz.com/api/oracle/callback',
};
const result = await launchOracleGame(settings, body);
console.log(JSON.stringify({
  success: result.success,
  message: result.message,
  source: result.source,
  launchFallback: result.launchFallback || null,
  hasUrl: Boolean(result.gameUrl),
  urlPreview: result.gameUrl ? String(result.gameUrl).slice(0, 80) : null,
}, null, 2));
process.exit(0);
NODE
'''
_, o, e = c.exec_command(patch, timeout=120)
print(o.read().decode('utf-8', 'replace'))
err = e.read().decode('utf-8', 'replace')
if err.strip():
    print('ERR:', err[-2000:])
c.close()
