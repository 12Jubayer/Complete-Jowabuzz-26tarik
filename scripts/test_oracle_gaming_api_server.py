#!/usr/bin/env python3
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmd = (
    'cd /www/wwwroot/jowabuzz/backend && '
    'node --input-type=module --eval "'
    "import 'dotenv/config';"
    "import { getAllProviders, getProviderByCode, getGames, launchGame, resolveOracleGamingCredentials } from './services/oracleGamingApiService.js';"
    "const creds=resolveOracleGamingCredentials();"
    "const report={callback:process.env.ORACLE_GAMES_CALLBACK_URL,version:process.env.ORACLE_GAMES_API_VERSION,tests:{}};"
    "try{const p=await getAllProviders();report.tests.providers={ok:p.length>0,count:p.length,sample:p.slice(0,3).map(x=>x.code)};}catch(e){report.tests.providers={ok:false,error:e.message};}"
    "const code=report.tests.providers?.sample?.[0]||'JILI';"
    "try{const r=await getProviderByCode(creds,code);report.tests.providerByCode={ok:true,code:r.provider.code,games:r.games.length};}catch(e){report.tests.providerByCode={ok:false,error:e.message};}"
    "const uid=process.env.ORACLE_GAMES_V3_TEST_GAME_UID||'4eef5090166a6889956a630321713366';"
    "try{const g=await getGames(creds,[uid]);report.tests.games={ok:g.length>0,name:g[0]?.name||null};}catch(e){report.tests.games={ok:false,error:e.message};}"
    "try{const l=await launchGame(creds,{username:'abcdefghij',game_uid:uid,amount:'1'});report.tests.launch={ok:Boolean(l.success&&l.gameUrl),message:l.message||null};}catch(e){report.tests.launch={ok:false,error:e.message};}"
    "console.log(JSON.stringify(report,null,2));"
    '"'
)

_, stdout, stderr = client.exec_command(cmd, timeout=120000)
print(stdout.read().decode('utf-8', 'replace'))
err = stderr.read().decode('utf-8', 'replace')
if err.strip():
    print('stderr:', err[:800])
client.close()
