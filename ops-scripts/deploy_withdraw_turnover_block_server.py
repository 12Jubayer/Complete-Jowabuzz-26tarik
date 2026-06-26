#!/usr/bin/env python3
"""Enable turnover withdraw block: DB settings + backend OTP guard + frontend UI."""
import json
import paramiko
import time

HOST = '103.168.173.101'
USER = 'root'
PASS = 'Jowabuzz@12'

def run(c, cmd, label=''):
    _, o, e = c.exec_command(cmd)
    out = o.read().decode('utf-8', errors='replace')
    err = e.read().decode('utf-8', errors='replace')
    if label:
        print(label)
    if out.strip():
        print(out[:2000])
    if err.strip() and 'Warning' not in err:
        print('ERR:', err[:500])
    return out, err

def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASS, timeout=30)

    # 1) Enable turnover flags in site_settings
    new_val = json.dumps({
        "depositMin": 100,
        "depositMax": 50000,
        "withdrawMin": 100,
        "withdrawMax": 25000,
        "requireTurnoverForWithdraw": True,
        "requireBonusTurnoverForWithdraw": True,
    })
    escaped = new_val.replace("'", "''")
    sql = f"UPDATE site_settings SET setting_value='{escaped}', updated_at=NOW() WHERE setting_key='general_deposit_withdraw';"
    sftp = c.open_sftp()
    with sftp.file('/tmp/enable_turnover_wd.sql', 'w') as f:
        f.write(sql + "\nSELECT setting_value FROM site_settings WHERE setting_key='general_deposit_withdraw';\n")
    sftp.close()
    run(c, 'mysql -uroot -p656940d50e847e3f jowabuzz < /tmp/enable_turnover_wd.sql', 'DB settings updated')

    # 2) Backend: enforce bonus turnover on OTP request
    otp_file = '/www/wwwroot/jowabuzz/backend/controllers/userWithdrawOtpController.js'
    sftp = c.open_sftp()
    with sftp.file(otp_file, 'r') as f:
        otp_content = f.read().decode('utf-8')

    needle = """    try {
      await enforceTurnoverForWithdraw(wallet);
    } catch (error) {
      return res.status(error.statusCode || 400).json({ error: error.message });
    }

    const connection = await pool.getConnection();
    try {
      const identifier = buildOtpIdentifier(user);"""

    replacement = """    try {
      await enforceTurnoverForWithdraw(wallet);
    } catch (error) {
      return res.status(error.statusCode || 400).json({ error: error.message });
    }

    try {
      await enforceBonusTurnoverForWithdraw(userId);
    } catch (error) {
      return res.status(error.statusCode || 400).json({ error: error.message });
    }

    const connection = await pool.getConnection();
    try {
      const identifier = buildOtpIdentifier(user);"""

    if needle in otp_content:
        otp_content = otp_content.replace(needle, replacement)
        with sftp.file(otp_file, 'w') as f:
            f.write(otp_content)
        print('PATCHED userWithdrawOtpController OTP request guard')
    elif 'await enforceBonusTurnoverForWithdraw(userId);' in otp_content and 'requestUserWithdrawOtp' in otp_content:
        print('OTP guard already present')
    else:
        print('WARN: OTP controller patch pattern not found')

    run(c, f'node --check {otp_file}', 'OTP controller syntax')

    # 3) Frontend WithdrawPage.jsx
    wd_file = '/www/wwwroot/jowabuzz/frontend/src/pages/WithdrawPage.jsx'
    with sftp.file(wd_file, 'r') as f:
        wd = f.read().decode('utf-8')

    if 'bonusTurnoverIncomplete' not in wd:
        old = """  const turnoverIncomplete =
    rules?.requireTurnoverForWithdraw !== false
    && profile?.wallet
    && !profile.wallet.turnoverComplete;
  const balance = user?.balance ?? profile?.balance ?? 0;"""
        new = """  const turnoverIncomplete =
    rules?.requireTurnoverForWithdraw !== false
    && profile?.wallet
    && !profile.wallet.turnoverComplete;
  const bonusTurnoverIncomplete =
    rules?.requireBonusTurnoverForWithdraw !== false
    && profile?.wallet
    && profile.wallet.bonusTurnoverComplete === false;
  const withdrawBlocked = turnoverIncomplete || bonusTurnoverIncomplete;
  const balance = user?.balance ?? profile?.balance ?? 0;"""
        if old in wd:
            wd = wd.replace(old, new)
            wd = wd.replace('turnoverIncomplete={turnoverIncomplete}', 'turnoverIncomplete={withdrawBlocked}')
            # fix PaymentGatewayWithdrawTab messages
            wd = wd.replace(
                'Turnover incomplete. Complete turnover before withdrawing.',
                'Turnover incomplete. Complete main and bonus turnover before withdrawing.',
            )
            with sftp.file(wd_file, 'w') as f:
                f.write(wd)
            print('PATCHED WithdrawPage.jsx')
        else:
            print('WARN: WithdrawPage pattern not found')
    else:
        print('WithdrawPage already patched')

    # 4) Frontend ProfileWithdrawPage.jsx
    pwd_file = '/www/wwwroot/jowabuzz/frontend/src/pages/profile/ProfileWithdrawPage.jsx'
    with sftp.file(pwd_file, 'r') as f:
        pwd = f.read().decode('utf-8')

    if 'bonusTurnoverIncomplete' not in pwd:
        old = """  const turnoverIncomplete =
    rules?.requireTurnoverForWithdraw !== false
    && profile?.wallet
    && !profile.wallet.turnoverComplete;
  const withdrawChannel = profile?.withdrawChannel || null;"""
        new = """  const turnoverIncomplete =
    rules?.requireTurnoverForWithdraw !== false
    && profile?.wallet
    && !profile.wallet.turnoverComplete;
  const bonusTurnoverIncomplete =
    rules?.requireBonusTurnoverForWithdraw !== false
    && profile?.wallet
    && profile.wallet.bonusTurnoverComplete === false;
  const withdrawBlocked = turnoverIncomplete || bonusTurnoverIncomplete;
  const withdrawChannel = profile?.withdrawChannel || null;"""
        if old in pwd:
            pwd = pwd.replace(old, new)
            pwd = pwd.replace('if (turnoverIncomplete) return;', 'if (withdrawBlocked) return;')
            pwd = pwd.replace(
                '{withdrawChannel === \'PAYMENT\' && turnoverIncomplete ? (',
                '{withdrawChannel === \'PAYMENT\' && withdrawBlocked ? (',
            )
            pwd = pwd.replace(
                'Turnover incomplete. Complete turnover before withdrawing.',
                'Turnover incomplete. Complete main and bonus turnover before withdrawing.',
            )
            # disable submit buttons
            pwd = pwd.replace(
                'disabled={submitting}',
                'disabled={submitting || withdrawBlocked}',
                2,
            )
            with sftp.file(pwd_file, 'w') as f:
                f.write(pwd)
            print('PATCHED ProfileWithdrawPage.jsx')
        else:
            print('WARN: ProfileWithdrawPage pattern not found')
    else:
        print('ProfileWithdrawPage already patched')

    sftp.close()

    # 5) Build frontend + restart backend
    run(c, 'cd /www/wwwroot/jowabuzz/frontend && npm run build 2>&1 | tail -15', 'Frontend build')
    run(c, 'cd /www/wwwroot/jowabuzz/backend && pm2 restart jowabuzz --update-env 2>&1 | head -5', 'PM2 restart')
    c.close()
    print('DONE')

if __name__ == '__main__':
    main()
