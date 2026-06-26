import paramiko, json
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

_, o, _ = c.exec_command("grep -A5 'resolvePrimaryDepositBonusProgress' /www/wwwroot/jowabuzz/backend/services/depositBonusService.js | head -15")
print('PATCH:', o.read().decode())

verify = """
const pool = require('./config/db.cjs');
(async () => {
  const mod = await import('./services/depositBonusService.js');
  const s = await mod.getUserDepositBonusStatus(31);
  const p = s.primaryProgress;
  console.log(JSON.stringify({
    id: p?.id,
    completed: p?.completedTurnover,
    required: p?.requiredTurnover,
    pct: p?.progressPercent,
    aggPct: p?.aggregateProgressPercent,
  }));
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
"""
# use direct sql simulation instead
sql = """
SELECT id, completed_turnover, required_turnover, progress, status, created_at
FROM user_bonus_accounts WHERE user_id=31 AND status='in_progress' ORDER BY created_at ASC;
"""
sftp = c.open_sftp()
with sftp.file('/tmp/verify_turnover.sql', 'w') as f:
    f.write(sql)
sftp.close()
_, o, _ = c.exec_command('mysql -uroot -p656940d50e847e3f jowabuzz < /tmp/verify_turnover.sql')
print('DB:', o.read().decode())

_, o, _ = c.exec_command('pm2 list | grep jowabuzz')
print('PM2:', o.read().decode())
c.close()
