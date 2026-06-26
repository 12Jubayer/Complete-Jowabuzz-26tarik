#!/usr/bin/env python3
"""Turnover = deposit + automatic 3% main-wallet bonus only."""
import paramiko
import time

HOST = '103.168.173.101'
USER = 'root'
PASS = 'Jowabuzz@12'
FILE = '/www/wwwroot/jowabuzz/backend/services/depositBonusService.js'
UI_FILE = '/www/wwwroot/jowabuzz/frontend/src/pages/profile/AccountPage.jsx'

HELPER = '''
async function resolveAutomaticMainWalletBonusAmount(connection, depositAmount) {
  const [[rule]] = await connection.query(
    `SELECT bonus_percent, min_deposit, max_deposit
     FROM deposit_bonus_rules
     WHERE id = ?
       AND is_active = 1
       AND start_date <= NOW()
       AND end_date >= NOW()
     LIMIT 1`,
    [AUTO_MAIN_WALLET_BONUS_RULE_ID],
  );
  if (!rule) return 0;
  const amount = Number(depositAmount);
  if (amount < Number(rule.min_deposit) || amount > Number(rule.max_deposit)) return 0;
  return Number(((amount * Number(rule.bonus_percent)) / 100).toFixed(2));
}

'''

OLD_START = 'export async function processDepositBalanceBonus(connection, transaction) {'
OLD_CREDIT = '  await creditAutomaticMainWalletDepositBonus(connection, transaction);'
NEW_CREDIT = '''  const mainBonusResult = await creditAutomaticMainWalletDepositBonus(connection, transaction);
  const autoMainBonus = Number(
    mainBonusResult?.bonusAmount
    ?? (await resolveAutomaticMainWalletBonusAmount(connection, Number(transaction.amount))),
  );'''

OLD_TURNOVER = '  const turnoverMultiplier = 1;\n  const newDepositTurnover = Number(depositAmount.toFixed(2));'
NEW_TURNOVER = '  const turnoverMultiplier = 1;\n  const newDepositTurnover = Number((depositAmount + autoMainBonus).toFixed(2));'

OLD_MERGED_BONUS = '    mergedBonus = activeAccounts.reduce((sum, row) => sum + Number(row.bonus_amount || 0), 0) + bonusAmount;'
NEW_MERGED_BONUS = '''    const poolAutoBonus = activeAccounts.reduce(
      (sum, row) => sum + Math.max(0, Number(row.required_turnover || 0) - Number(row.deposit_amount || 0)),
      0,
    );
    mergedBonus = activeAccounts.reduce((sum, row) => sum + Number(row.bonus_amount || 0), 0) + bonusAmount;
    const mergedAutoBonus = Number((poolAutoBonus + autoMainBonus).toFixed(2));'''

# After mergedBonus line we need to use mergedAutoBonus in insert - actually bonus_amount column stays balance bonus
# Add autoMainBonusTotal to insert - use bonus_amount for balance, track auto via required-deposit

OLD_INSERT_BONUS = '      Number(mergedBonus.toFixed(2)),'
# Keep mergedBonus for balance bonus

UI_OLD = """            {depositBonusBalance > 0 ? (
              <p className="mt-1 text-xs text-violet-600">
                Deposit bonus: {currencySymbol}{formatMoney(depositBonusBalance)}
              </p>
            ) : null}"""

UI_NEW = """            {(() => {
              const dep = Number(bonusProgress?.depositAmount || 0);
              const req = Number(bonusProgress?.requiredTurnover || 0);
              const autoBonus = Math.max(0, Number((req - dep).toFixed(2)));
              return (
                <>
                  {dep > 0 ? (
                    <p className="mt-1 text-xs text-violet-600">
                      Deposit: {currencySymbol}{formatMoney(dep)}
                      {autoBonus > 0 ? ` + 3% Bonus: ${currencySymbol}${formatMoney(autoBonus)}` : ''}
                    </p>
                  ) : null}
                  {depositBonusBalance > 0 ? (
                    <p className="mt-1 text-xs text-violet-600">
                      Balance bonus: {currencySymbol}{formatMoney(depositBonusBalance)}
                    </p>
                  ) : null}
                </>
              );
            })()}"""

RETRO = """
UPDATE user_bonus_accounts a
SET
  required_turnover = ROUND(a.deposit_amount + (a.deposit_amount * 3 / 100), 2),
  remaining_turnover = GREATEST(0, ROUND(a.deposit_amount + (a.deposit_amount * 3 / 100), 2) - a.completed_turnover),
  progress = CASE
    WHEN (a.deposit_amount + (a.deposit_amount * 3 / 100)) <= 0 THEN 100
    ELSE LEAST(100, ROUND((a.completed_turnover / (a.deposit_amount + (a.deposit_amount * 3 / 100))) * 100, 2))
  END,
  updated_at = NOW()
WHERE a.status = 'in_progress';

SELECT id, user_id, deposit_amount, required_turnover, completed_turnover, progress
FROM user_bonus_accounts WHERE status='in_progress';
"""


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASS, timeout=30)
    sftp = c.open_sftp()

    with sftp.file(FILE, 'r') as f:
        content = f.read().decode('utf-8')

    if 'resolveAutomaticMainWalletBonusAmount' not in content:
        content = content.replace(OLD_START, HELPER + OLD_START)
        print('ADDED helper')

    if OLD_CREDIT in content and 'mainBonusResult' not in content:
        content = content.replace(OLD_CREDIT, NEW_CREDIT)
        print('PATCHED credit capture')

    if OLD_TURNOVER in content:
        content = content.replace(OLD_TURNOVER, NEW_TURNOVER)
        print('PATCHED turnover = deposit + 3%')

    with sftp.file(FILE, 'w') as f:
        f.write(content)

    with sftp.file(UI_FILE, 'r') as f:
        ui = f.read().decode('utf-8')
    if UI_OLD in ui:
        ui = ui.replace(UI_OLD, UI_NEW)
        with sftp.file(UI_FILE, 'w') as f:
            f.write(ui)
        print('PATCHED UI breakdown')

    with sftp.file('/tmp/retro_turnover_206.sql', 'w') as f:
        f.write(RETRO)
    sftp.close()

    c.exec_command(f'node --check {FILE}')
    _, o, _ = c.exec_command('mysql -uroot -p656940d50e847e3f jowabuzz < /tmp/retro_turnover_206.sql')
    print('RETRO:', o.read().decode())

    c.exec_command('cd /www/wwwroot/jowabuzz/frontend && npm run build 2>&1')
    time.sleep(50)
    _, o, _ = c.exec_command('test -f /www/wwwroot/jowabuzz/frontend/dist/index.html && echo OK || echo FAIL')
    print('BUILD:', o.read().decode().strip())
    c.exec_command('cd /www/wwwroot/jowabuzz/backend && pm2 restart jowabuzz --update-env')
    c.close()
    print('DONE')

if __name__ == '__main__':
    main()
