#!/usr/bin/env python3
"""Same FIFO primary progress fix for bonus_user_progress turnover bonuses."""
import paramiko

HOST = '103.168.173.101'
USER = 'root'
PASS = 'Jowabuzz@12'
FILE = '/www/wwwroot/jowabuzz/backend/services/bonusUserProgressService.js'

HELPER = r'''
function resolvePrimaryBonusProgress(active) {
  if (!active.length) return null;

  const sorted = [...active].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const current = sorted.find(
    (row) => Number(row.remainingTurnover ?? 0) > 0
      || Number(row.completedTurnover ?? 0) < Number(row.requiredTurnover ?? 0),
  ) || sorted[sorted.length - 1];

  const aggregateRequired = active.reduce((sum, row) => sum + Number(row.requiredTurnover || 0), 0);
  const aggregateCompleted = active.reduce((sum, row) => sum + Number(row.completedTurnover || 0), 0);
  const aggregatePercent = aggregateRequired > 0
    ? Number(Math.min(100, (aggregateCompleted / aggregateRequired) * 100).toFixed(2))
    : 100;

  return {
    ...current,
    aggregateRequiredTurnover: Number(aggregateRequired.toFixed(2)),
    aggregateCompletedTurnover: Number(aggregateCompleted.toFixed(2)),
    aggregateProgressPercent: aggregatePercent,
    activeAccountCount: active.length,
  };
}

'''

OLD = '  const primary = active[0] || null;'
NEW = '  const primary = resolvePrimaryBonusProgress(active);'

def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASS, timeout=30)
    sftp = c.open_sftp()
    with sftp.file(FILE, 'r') as f:
        content = f.read().decode('utf-8')

    if 'resolvePrimaryBonusProgress' not in content:
        anchor = 'export async function getUserBonusWalletSummary(userId) {'
        if anchor not in content:
            raise SystemExit('anchor not found')
        content = content.replace(anchor, HELPER + anchor)
        print('ADDED helper')

    if OLD in content:
        content = content.replace(OLD, NEW)
        print('PATCHED primary')
    else:
        print('primary already patched or line missing')

    with sftp.file(FILE, 'w') as f:
        f.write(content)
    sftp.close()

    _, o, e = c.exec_command(f'node --check {FILE}')
    if e.read().decode().strip():
        raise SystemExit('syntax error')
    print('syntax: ok')
    c.close()

if __name__ == '__main__':
    main()
