#!/usr/bin/env python3
"""Fix bonus turnover: deposit amount only (1x), aggregate display, retro-correct DB."""
import paramiko

HOST = '103.168.173.101'
USER = 'root'
PASS = 'Jowabuzz@12'
FILE = '/www/wwwroot/jowabuzz/backend/services/depositBonusService.js'

OLD_CALC = """  const bonusPercent = Number(rule.bonus_percent);
  const turnoverMultiplier = Number(rule.turnover_multiplier);
  const playableTotal = depositAmount + bonusAmount;
  const requiredTurnover = Number((playableTotal * turnoverMultiplier).toFixed(2));
  const remainingTurnover = requiredTurnover;"""

NEW_CALC = """  const bonusPercent = Number(rule.bonus_percent);
  const turnoverMultiplier = 1;
  const requiredTurnover = Number(depositAmount.toFixed(2));
  const remainingTurnover = Number(Math.max(0, requiredTurnover).toFixed(2));"""

OLD_RESOLVE = """function resolvePrimaryDepositBonusProgress(inProgress) {
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
}"""

NEW_RESOLVE = """function resolvePrimaryDepositBonusProgress(inProgress) {
  if (!inProgress.length) return null;

  const aggregateRequired = inProgress.reduce((sum, row) => sum + Number(row.requiredTurnover || 0), 0);
  const aggregateCompleted = inProgress.reduce((sum, row) => sum + Number(row.completedTurnover || 0), 0);
  const aggregateRemaining = Math.max(0, aggregateRequired - aggregateCompleted);
  const aggregatePercent = aggregateRequired > 0
    ? Number(Math.min(100, (aggregateCompleted / aggregateRequired) * 100).toFixed(2))
    : 100;

  const sorted = [...inProgress].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return {
    ...sorted[0],
    requiredTurnover: Number(aggregateRequired.toFixed(2)),
    completedTurnover: Number(aggregateCompleted.toFixed(2)),
    remainingTurnover: Number(aggregateRemaining.toFixed(2)),
    progressPercent: aggregatePercent,
    progress: aggregatePercent,
    activeAccountCount: inProgress.length,
    isAggregate: true,
  };
}"""

SQL = """
UPDATE deposit_bonus_rules SET turnover_multiplier = 1 WHERE turnover_multiplier <> 1;

UPDATE user_bonus_accounts
SET
  required_turnover = deposit_amount,
  remaining_turnover = GREATEST(0, ROUND(deposit_amount - completed_turnover, 2)),
  progress = CASE
    WHEN deposit_amount <= 0 THEN 100
    ELSE LEAST(100, ROUND((completed_turnover / deposit_amount) * 100, 2))
  END,
  turnover_multiplier = 1,
  updated_at = NOW()
WHERE status = 'in_progress';

UPDATE user_bonus_accounts
SET status = 'completed', progress = 100, remaining_turnover = 0, updated_at = NOW()
WHERE status = 'in_progress'
  AND completed_turnover >= deposit_amount
  AND deposit_amount > 0;

SELECT a.id, u.name, a.deposit_amount, a.required_turnover, a.completed_turnover, a.progress, a.status
FROM user_bonus_accounts a
JOIN users u ON u.id = a.user_id
WHERE a.user_id IN (31, 38) AND a.status IN ('in_progress', 'completed')
ORDER BY a.user_id, a.id;
"""


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASS, timeout=30)

    sftp = c.open_sftp()
    with sftp.file(FILE, 'r') as f:
        content = f.read().decode('utf-8')

    changed = False
    if OLD_CALC in content:
        content = content.replace(OLD_CALC, NEW_CALC)
        print('PATCHED turnover calc = deposit amount')
        changed = True
    elif 'const requiredTurnover = Number(depositAmount.toFixed(2));' in content:
        print('turnover calc already patched')
    else:
        print('WARN: turnover calc block not found')

    if OLD_RESOLVE in content:
        content = content.replace(OLD_RESOLVE, NEW_RESOLVE)
        print('PATCHED aggregate primary progress display')
        changed = True
    elif 'isAggregate: true' in content:
        print('aggregate display already patched')
    else:
        print('WARN: resolvePrimary block not found')

    if changed:
        with sftp.file(FILE, 'w') as f:
            f.write(content)

    with sftp.file('/tmp/fix_turnover.sql', 'w') as f:
        f.write(SQL)
    sftp.close()

    _, o, e = c.exec_command(f'node --check {FILE}')
    if e.read().decode().strip():
        raise SystemExit('syntax error in depositBonusService.js')

    _, o, _ = c.exec_command('mysql -uroot -p656940d50e847e3f jowabuzz < /tmp/fix_turnover.sql')
    print('DB:', o.read().decode())

    _, o, _ = c.exec_command('cd /www/wwwroot/jowabuzz/backend && pm2 restart jowabuzz --update-env 2>&1')
    out = o.read().decode('utf-8', errors='replace')
    print('PM2:', out.encode('ascii', errors='replace').decode()[:200])
    c.close()
    print('DONE')

if __name__ == '__main__':
    main()
