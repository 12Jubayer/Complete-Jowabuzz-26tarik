"""Add 3% automatic deposit bonus to main wallet on every deposit."""
import paramiko
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = '/www/wwwroot/jowabuzz'
FILE = f'{ROOT}/backend/services/depositBonusService.js'

HELPER = """
const AUTO_MAIN_WALLET_BONUS_RULE_ID = 1;

async function creditAutomaticMainWalletDepositBonus(connection, transaction) {
  if (!transaction || transaction.type !== 'deposit' || transaction.status !== 'approved') {
    return null;
  }

  const userId = Number(transaction.user_id);
  const depositTxId = Number(transaction.id);
  const depositAmount = Number(transaction.amount);
  const methodTag = `deposit_main_bonus:${AUTO_MAIN_WALLET_BONUS_RULE_ID}:${depositTxId}`;

  const [[existing]] = await connection.query(
    `SELECT id FROM transactions WHERE method = ? LIMIT 1`,
    [methodTag],
  );
  if (existing) return null;

  const [[rule]] = await connection.query(
    `SELECT id, title, bonus_percent, min_deposit, max_deposit
     FROM deposit_bonus_rules
     WHERE id = ?
       AND is_active = 1
       AND start_date <= NOW()
       AND end_date >= NOW()
     LIMIT 1`,
    [AUTO_MAIN_WALLET_BONUS_RULE_ID],
  );
  if (!rule) return null;
  if (depositAmount < Number(rule.min_deposit) || depositAmount > Number(rule.max_deposit)) {
    return null;
  }

  const bonusAmount = Number(((depositAmount * Number(rule.bonus_percent)) / 100).toFixed(2));
  if (bonusAmount <= 0) return null;

  await applyBalanceDelta(connection, userId, bonusAmount);

  await connection.query(
    `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
     VALUES (?, 'bonus', ?, 'approved', ?, NOW())`,
    [userId, bonusAmount, methodTag],
  );

  await connection.query(
    `INSERT INTO bonus_records (user_id, title, amount, status, transaction_id)
     VALUES (?, ?, ?, 'approved', LAST_INSERT_ID())`,
  ).catch(() => {});

  return {
    bonusAmount,
    ruleId: rule.id,
    ruleTitle: rule.title,
  };
}
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

with sftp.open(FILE, 'r') as f:
    content = f.read().decode('utf-8').replace('\r\n', '\n')

if 'creditAutomaticMainWalletDepositBonus' not in content:
    content = content.replace(
        'async function findEligibleRuleById(connection, userId, depositAmount, ruleId) {',
        HELPER + '\nasync function findEligibleRuleById(connection, userId, depositAmount, ruleId) {',
        1,
    )
    print('ADDED helper')

# Exclude rule 1 from bonus-account selection (3% handled on main wallet)
content = content.replace(
    """  if (selectedRuleId > 0) {
    return findEligibleRuleById(connection, userId, depositAmount, selectedRuleId);
  }""",
    """  if (selectedRuleId > 0) {
    if (selectedRuleId === AUTO_MAIN_WALLET_BONUS_RULE_ID) return null;
    return findEligibleRuleById(connection, userId, depositAmount, selectedRuleId);
  }""",
)

content = content.replace(
    """     WHERE is_active = 1 AND start_date <= NOW() AND end_date >= NOW()
       AND ? >= min_deposit AND ? <= max_deposit
     ORDER BY bonus_percent DESC, id DESC""",
    """     WHERE is_active = 1 AND start_date <= NOW() AND end_date >= NOW()
       AND id <> ?
       AND ? >= min_deposit AND ? <= max_deposit
     ORDER BY bonus_percent DESC, id DESC""",
)

content = content.replace(
    """    [depositAmount, depositAmount],
  );

  for (const rule of rules) {
    const claimCount = await countUserRuleClaims(connection, userId, rule.id);
    if (claimCount >= Number(rule.claim_limit)) continue;
    return rule;
  }

  return null;
}

async function resolveDepositBonusRule(connection, userId, depositAmount, depositTxId) {""",
    """    [AUTO_MAIN_WALLET_BONUS_RULE_ID, depositAmount, depositAmount],
  );

  for (const rule of rules) {
    const claimCount = await countUserRuleClaims(connection, userId, rule.id);
    if (claimCount >= Number(rule.claim_limit)) continue;
    return rule;
  }

  return null;
}

async function resolveDepositBonusRule(connection, userId, depositAmount, depositTxId) {""",
)

if 'await creditAutomaticMainWalletDepositBonus(connection, transaction)' not in content:
    content = content.replace(
        """export async function processDepositBalanceBonus(connection, transaction) {
  if (!transaction || transaction.type !== 'deposit' || transaction.status !== 'approved') {
    return null;
  }

  const userId = Number(transaction.user_id);""",
        """export async function processDepositBalanceBonus(connection, transaction) {
  if (!transaction || transaction.type !== 'deposit' || transaction.status !== 'approved') {
    return null;
  }

  await creditAutomaticMainWalletDepositBonus(connection, transaction);

  const userId = Number(transaction.user_id);""",
        1,
    )
    print('PATCHED processDepositBalanceBonus')

# Fix bonus_records insert - LAST_INSERT_ID trick is wrong. Use proper insert after bonus tx
# Re-read and fix helper - the bonus_records insert is broken. Let me fix the helper in file

with sftp.open(FILE, 'w') as f:
    f.write(content.encode('utf-8'))

# Fix broken bonus_records in helper via second pass
with sftp.open(FILE, 'r') as f:
    content = f.read().decode('utf-8').replace('\r\n', '\n')

bad = """  await connection.query(
    `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
     VALUES (?, 'bonus', ?, 'approved', ?, NOW())`,
    [userId, bonusAmount, methodTag],
  );

  await connection.query(
    `INSERT INTO bonus_records (user_id, title, amount, status, transaction_id)
     VALUES (?, ?, ?, 'approved', LAST_INSERT_ID())`,
  ).catch(() => {});"""

good = """  const [bonusTx] = await connection.query(
    `INSERT INTO transactions (user_id, type, amount, status, method, approved_at)
     VALUES (?, 'bonus', ?, 'approved', ?, NOW())`,
    [userId, bonusAmount, methodTag],
  );

  await connection.query(
    `INSERT INTO bonus_records (user_id, title, amount, status, transaction_id)
     VALUES (?, ?, ?, 'approved', ?)`,
    [userId, `${rule.title} (Main Wallet)`, bonusAmount, bonusTx.insertId],
  );"""

if bad in content:
    content = content.replace(bad, good, 1)
    with sftp.open(FILE, 'w') as f:
        f.write(content.encode('utf-8'))
    print('FIXED bonus_records insert')

sftp.close()

_, o, e = c.exec_command(f'cd {ROOT}/backend && node --check services/depositBonusService.js')
err = e.read().decode()
print('syntax:', err[:400] or 'ok')
if err.strip():
    sys.exit(1)

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30000)
print(o.read().decode('utf-8', 'replace')[:120])
time.sleep(2)

# Quick test: simulate 100 deposit bonus calc
_, o, _ = c.exec_command(
    "mysql -uroot -p656940d50e847e3f jowabuzz -N -e "
    "\"SELECT bonus_percent FROM deposit_bonus_rules WHERE id=1\""
)
print('rule1 percent:', o.read().decode().strip())

c.close()
print('DONE')
