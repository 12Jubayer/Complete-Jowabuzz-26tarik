import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

path = '/www/wwwroot/jowabuzz/backend/services/hmkApiService.js'

# Read current function
_, o, _ = c.exec_command(f"sed -n '255,265p' {path}", timeout=30)
print('BEFORE:\n', o.read().decode('utf-8','replace'))

old = """function isHmkLaunchUid(value) {
  const code = trim(value);
  if (!code || code === '0' || isOracleOnlyUid(code)) return false;
  return true;
}"""

new = """function isHmkLaunchUid(value) {
  const code = trim(value);
  if (!code || code === '0') return false;
  if (isOracleOnlyUid(code)) {
    return (
      trim(process.env.HMK_PRIMARY_PROVIDER).toLowerCase() === 'true'
      || trim(process.env.ORACLE_DISABLED).toLowerCase() === 'true'
    );
  }
  return true;
}"""

patch_script = f'''
path = {path!r}
text = open(path, encoding="utf-8").read()
old = {old!r}
new = {new!r}
if old not in text:
    print("PATCH_FAILED_NOT_FOUND")
else:
    open(path, "w", encoding="utf-8").write(text.replace(old, new, 1))
    print("PATCH_OK")
'''

_, o, e = c.exec_command(f"python3 -c {patch_script!r}", timeout=30000)
print(o.read().decode('utf-8','replace'), e.read().decode('utf-8','replace')[:200])

_, o, _ = c.exec_command(f"sed -n '255,268p' {path}", timeout=30)
print('AFTER:\n', o.read().decode('utf-8','replace'))

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
print(o.read().decode('utf-8','replace')[:150])

# verify launch via API
verify = r'''
cd /www/wwwroot/jowabuzz/backend && node <<'NODE'
import 'dotenv/config';
import { connectDatabase } from './config/db.js';
import { launchHmkGameSession } from './services/hmkApiService.js';
await connectDatabase();
const pool = (await import('./config/db.js')).getPool();
const [[g]] = await pool.query(`SELECT g.*, p.code AS provider_code FROM games g JOIN providers p ON p.id=g.provider_id WHERE g.name='Fortune Tiger' AND p.code='PG' LIMIT 1`);
try {
  const r = await launchHmkGameSession({ user:{id:1}, game:g, sessionToken:'t', launchBalance:100 });
  console.log('LAUNCH_OK', !!r.launchUrl, r.launchUrl?.slice(0,80));
} catch(e) { console.log('LAUNCH_FAIL', e.message); }
NODE
'''
_, o, _ = c.exec_command(verify, timeout=60000)
print(o.read().decode('utf-8','replace'))
c.close()
