#!/usr/bin/env python3
"""Fix bonus turnover display: show FIFO active account progress, not newest."""
import paramiko

HOST = '103.168.173.101'
USER = 'root'
PASS = 'Jowabuzz@12'
FILE = '/www/wwwroot/jowabuzz/backend/services/depositBonusService.js'

HELPER = r'''
function resolvePrimaryDepositBonusProgress(inProgress) {
  if (!inProgress.length) return null;

  const sorted = [...inProgress].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const current = sorted.find(
    (row) => Number(row.remainingTurnover ?? 0) > 0
      || Number(row.completedTurnover ?? 0) < Number(row.requiredTurnover ?? 0),
  ) || sorted[sorted.length - 1];

  const aggregateRequired = inProgress.reduce((sum, row) => sum + Number(row.requiredTurnover || 0), 0);
  const aggregateCompleted = inProgress.reduce((sum, row) => sum + Number(row.completedTurnover || 0), 0);
  const aggregatePercent = aggregateRequired > 0
    ? Number(Math.min(100, (aggregateCompleted / aggregateRequired) * 100).toFixed(2))
    : 100;

  return {
    ...current,
    aggregateRequiredTurnover: Number(aggregateRequired.toFixed(2)),
    aggregateCompletedTurnover: Number(aggregateCompleted.toFixed(2)),
    aggregateProgressPercent: aggregatePercent,
    activeAccountCount: inProgress.length,
  };
}

'''

OLD = '    primaryProgress: inProgress[0] || null,'
NEW = '    primaryProgress: resolvePrimaryDepositBonusProgress(inProgress),'

def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASS, timeout=30)
    sftp = c.open_sftp()
    with sftp.file(FILE, 'r') as f:
        content = f.read().decode('utf-8')

    if 'resolvePrimaryDepositBonusProgress' not in content:
        anchor = 'export async function getUserDepositBonusStatus(userId) {'
        if anchor not in content:
            raise SystemExit('anchor not found')
        content = content.replace(anchor, HELPER + anchor)
        print('ADDED helper')

    if OLD not in content:
        if NEW.split('\n')[0].strip() in content:
            print('ALREADY patched primaryProgress')
        else:
            raise SystemExit('primaryProgress line not found')
    else:
        content = content.replace(OLD, NEW)
        print('PATCHED primaryProgress')

    with sftp.file(FILE, 'w') as f:
        f.write(content)
    sftp.close()

    _, o, e = c.exec_command(f'node --check {FILE}')
    out, err = o.read().decode(), e.read().decode()
    if err.strip():
        print('SYNTAX ERR', err)
        raise SystemExit(1)
    print('syntax: ok')

    _, o, _ = c.exec_command('cd /www/wwwroot/jowabuzz/backend && pm2 restart jowabuzz --update-env')
    print(o.read().decode()[:400])

    verify = r"""
import { getUserDepositBonusStatus } from './services/depositBonusService.js';
const s = await getUserDepositBonusStatus(31);
console.log(JSON.stringify({
  primary: s.primaryProgress ? {
    id: s.primaryProgress.id,
    completed: s.primaryProgress.completedTurnover,
    required: s.primaryProgress.requiredTurnover,
    pct: s.primaryProgress.progressPercent,
    aggPct: s.primaryProgress.aggregateProgressPercent,
  } : null
}));
process.exit(0);
"""
    sftp = c.open_sftp()
    with sftp.file('/www/wwwroot/jowabuzz/backend/tmp_verify_turnover.mjs', 'w') as f:
        f.write(verify)
    sftp.close()
    _, o, e = c.exec_command('cd /www/wwwroot/jowabuzz/backend && node tmp_verify_turnover.mjs')
    print(o.read().decode())
    err = e.read().decode()
    if err:
        print('VERIFY ERR', err[:500])
    c.exec_command('rm -f /www/wwwroot/jowabuzz/backend/tmp_verify_turnover.mjs')
    c.close()
    print('DONE')

if __name__ == '__main__':
    main()
