import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

REMOTE = '/www/wwwroot/jowabuzz/backend/controllers/gameController.js'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()
with sftp.open(REMOTE, 'r') as f:
    gc = f.read().decode('utf-8').replace('\r\n', '\n')

old = """    return res.json({
      success: true,
      sessionId: sessionResult.insertId,
      sessionToken,
      userId,
      playerId: identity.playerId,
      username: identity.username,
      game: {
        id: game.id,
        code: game.code,
        name: game.name,
        minBet: Number(game.min_bet),
        gameType: game.game_type || game.category,
      },
      provider: {
        id: game.provider_id,
        code: game.provider_code,
        name: game.provider_name,
      },
      balance: launchBalance,
      launchUrl,
      launch: providerPayload,
    });"""

new = """    return succeedLaunch({
      success: true,
      sessionId: sessionResult.insertId,
      sessionToken,
      userId,
      playerId: identity.playerId,
      username: identity.username,
      game: {
        id: game.id,
        code: game.code,
        name: game.name,
        minBet: Number(game.min_bet),
        gameType: game.game_type || game.category,
      },
      provider: {
        id: game.provider_id,
        code: game.provider_code,
        name: game.provider_name,
      },
      balance: launchBalance,
      launchUrl,
      launch: providerPayload,
    });"""

if old in gc:
    gc = gc.replace(old, new, 1)
    with sftp.open(REMOTE, 'w') as f:
        f.write(gc.encode('utf-8'))
    print('FIXED succeedLaunch return')
else:
    print('BLOCK NOT FOUND')
    idx = gc.find('sessionResult.insertId')
    print(gc[idx-100:idx+400])

sftp.close()
_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30000)
print(o.read().decode('utf-8', 'replace')[:200])
c.close()
