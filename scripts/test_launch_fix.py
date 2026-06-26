#!/usr/bin/env python3
import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
script = r'''
set -a
source /www/wwwroot/jowabuzz/backend/.env
set +a
cd /www/wwwroot/jowabuzz/backend
node --input-type=module <<'NODE'
import { launchOracleGame } from './services/oracleGamesApiClient.js';
import { getGamingGatewaySettingsInternal } from './services/gamingGatewayService.js';
import { connectDatabase } from './config/db.js';

await connectDatabase();
const settings = await getGamingGatewaySettingsInternal();
for (const sample of [
  { username: '01700000000', money: 100, game_code: '77', provider_code: 'JILIS', game_type: 'SLOT' },
  { username: '01700000000', money: 100, game_code: 'KYS-H5-99999', provider_code: '5G_UNI', game_type: 'SLOT' },
]) {
  const result = await launchOracleGame(settings, { ...sample, callback_url: 'https://jowabuzz.com/api/oracle/callback' });
  console.log(JSON.stringify({
    game_code: sample.game_code,
    success: result.success,
    message: result.message,
    source: result.source,
    launchFallback: result.launchFallback || null,
    hasUrl: Boolean(result.gameUrl),
  }));
}
NODE
'''
_, o, e = c.exec_command(script, timeout=90)
print(o.read().decode('utf-8', 'replace'))
print(e.read().decode('utf-8', 'replace')[-1500:])
c.close()
