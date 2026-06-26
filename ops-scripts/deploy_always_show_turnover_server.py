#!/usr/bin/env python3
"""Always show Turnover card on profile with bonus or main wallet turnover."""
import paramiko

HOST = '103.168.173.101'
USER = 'root'
PASS = 'Jowabuzz@12'
FILE = '/www/wwwroot/jowabuzz/frontend/src/pages/profile/AccountPage.jsx'

OLD_VARS = """  const bonusTurnoverIncomplete =
    withdrawRules?.requireBonusTurnoverForWithdraw !== false
    && wallet
    && wallet.bonusTurnoverComplete === false;

  const handleCopyId = async () => {"""

NEW_VARS = """  const bonusTurnoverIncomplete =
    withdrawRules?.requireBonusTurnoverForWithdraw !== false
    && wallet
    && wallet.bonusTurnoverComplete === false;

  const turnoverStats = bonusProgress
    ? {
        completedTurnover: Number(bonusProgress.completedTurnover || 0),
        requiredTurnover: Number(bonusProgress.requiredTurnover || 0),
        progressPercent: Number(bonusProgress.progressPercent || 0),
        isComplete: !bonusTurnoverIncomplete,
      }
    : wallet
      ? {
          completedTurnover: Number(wallet.completedTurnover || 0),
          requiredTurnover: Number(wallet.requiredTurnover || 0),
          progressPercent: wallet.turnoverComplete
            ? 100
            : Number(wallet.requiredTurnover) > 0
              ? Math.min(100, (Number(wallet.completedTurnover || 0) / Number(wallet.requiredTurnover)) * 100)
              : 100,
          isComplete: Boolean(wallet.turnoverComplete),
        }
      : {
          completedTurnover: 0,
          requiredTurnover: 0,
          progressPercent: 100,
          isComplete: true,
        };

  const handleCopyId = async () => {"""

OLD_CARD = """        {bonusBalance > 0 || bonusProgress ? (
          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Gift size={16} className="text-violet-600" />
                <span className="text-sm font-semibold text-violet-700">Turnover</span>
              </div>
              <p className="text-lg font-bold text-violet-700">
                {hideBalance ? `${currencySymbol} ••••` : `${currencySymbol} ${formatMoney(bonusBalance)}`}
              </p>
            </div>
            {depositBonusBalance > 0 ? (
              <p className="mt-1 text-xs text-violet-600">
                Deposit bonus: {currencySymbol}{formatMoney(depositBonusBalance)}
              </p>
            ) : null}
            {bonusProgress ? (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Bonus turnover</span>
                  <span>
                    {currencySymbol}{formatMoney(bonusProgress.completedTurnover)} / {currencySymbol}
                    {formatMoney(bonusProgress.requiredTurnover)} (
                    {Math.round(bonusProgress.progressPercent || 0)}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${Math.min(100, bonusProgress.progressPercent || 0)}%` }}
                  />
                </div>
                {bonusTurnoverIncomplete ? (
                  <p className="mt-1 text-[11px] text-amber-600">Complete bonus turnover to unlock withdrawal</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}"""

NEW_CARD = """        {loggedIn ? (
          <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Timer size={16} className="text-violet-600" />
                <span className="text-sm font-semibold text-violet-700">Turnover</span>
              </div>
              <p className="text-lg font-bold text-violet-700">
                {hideBalance ? '••••' : `${Math.round(turnoverStats.progressPercent || 0)}%`}
              </p>
            </div>
            {depositBonusBalance > 0 ? (
              <p className="mt-1 text-xs text-violet-600">
                Deposit bonus: {currencySymbol}{formatMoney(depositBonusBalance)}
              </p>
            ) : null}
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Total turnover</span>
                <span>
                  {hideBalance
                    ? '••••'
                    : `${currencySymbol}${formatMoney(turnoverStats.completedTurnover)} / ${currencySymbol}${formatMoney(turnoverStats.requiredTurnover)} (${Math.round(turnoverStats.progressPercent || 0)}%)`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${Math.min(100, turnoverStats.progressPercent || 0)}%` }}
                />
              </div>
              {turnoverIncomplete || bonusTurnoverIncomplete ? (
                <p className="mt-1 text-[11px] text-amber-600">Complete turnover to unlock withdrawal</p>
              ) : turnoverStats.isComplete && turnoverStats.requiredTurnover > 0 ? (
                <p className="mt-1 text-[11px] text-emerald-600">Turnover complete</p>
              ) : null}
            </div>
          </div>
        ) : null}"""

def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASS, timeout=30)
    sftp = c.open_sftp()
    with sftp.file(FILE, 'r') as f:
        content = f.read().decode('utf-8')

    if 'const turnoverStats = bonusProgress' not in content:
        if OLD_VARS not in content:
            raise SystemExit('vars block not found')
        content = content.replace(OLD_VARS, NEW_VARS)
        print('ADDED turnoverStats')
    else:
        print('turnoverStats exists')

    if OLD_CARD in content:
        content = content.replace(OLD_CARD, NEW_CARD)
        print('PATCHED turnover card')
    elif 'Total turnover' in content and 'loggedIn ?' in content:
        print('card already patched')
    else:
        raise SystemExit('card block not found')

    with sftp.file(FILE, 'w') as f:
        f.write(content)
    sftp.close()

    _, o, e = c.exec_command('cd /www/wwwroot/jowabuzz/frontend && npm run build 2>&1 | tail -8')
    print(o.read().decode('utf-8', errors='replace'))
    err = e.read().decode('utf-8', errors='replace')
    if err and 'built in' not in err.lower():
        print('build err', err[-500:])

    c.exec_command('cd /www/wwwroot/jowabuzz/backend && pm2 restart jowabuzz --update-env')
    c.close()
    print('DONE')

if __name__ == '__main__':
    main()
