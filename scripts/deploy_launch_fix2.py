#!/usr/bin/env python3
import paramiko, sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
root = Path(__file__).resolve().parent.parent
files = [
    'backend/services/oracleGamesApiClient.js',
    'backend/services/oracleGamesApiClient.v2.js',
    'backend/services/gamingGatewayService.js',
]
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()
for rel in files:
    sftp.put(str(root / rel), f'/www/wwwroot/jowabuzz/{rel}')
sftp.close()
script = r'''
pm2 restart jowabuzz
sleep 5
set -a; source /www/wwwroot/jowabuzz/backend/.env; set +a
cd /www/wwwroot/jowabuzz/backend
node --input-type=module <<'NODE'
import { launchOracleGame } from './services/oracleGamesApiClient.js';
import { connectDatabase } from './config/db.js';
import { getGamingGatewaySettingsInternal } from './services/gamingGatewayService.js';

await connectDatabase();
const settings = await getGamingGatewaySettingsInternal();
const samples = [
  { username: '01700000000', money: 100, game_code: '77', provider_code: 'JILIS', game_type: 'SLOT' },
  { username: '01700000000', money: 100, game_code: 'KYS-H5-99999', provider_code: '5G_UNI', game_type: 'SLOT' },
];
for (const sample of samples) {
  const result = await launchOracleGame(settings, {
    ...sample,
    callback_url: 'https://jowabuzz.com/api/oracle/callback',
  });
  console.log(JSON.stringify({
    game: sample.game_code,
    success: result.success,
    message: result.message,
    source: result.source,
    hasUrl: Boolean(result.gameUrl),
  }));
}
NODE
'''
_, o, e = c.exec_command(script, timeout=120000)
print(o.read().decode('utf-8', 'replace'))
print(e.read().decode('utf-8', 'replace')[-2000:])
c.close()
