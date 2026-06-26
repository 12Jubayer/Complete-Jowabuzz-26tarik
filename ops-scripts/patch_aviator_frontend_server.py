"""Patch server frontend launch lock + GameGrid double-click fix, then rebuild."""
import paramiko
import sys
import time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

# 1) gameWalletService.js - in-flight launch lock
GWS = '/www/wwwroot/jowabuzz/frontend/src/services/gameWalletService.js'
with sftp.open(GWS, 'r') as f:
    gws = f.read().decode('utf-8').replace('\r\n', '\n')

if 'launchLocks' not in gws:
    gws = gws.replace(
        "const LAUNCH_TIMEOUT_MS = 30000;",
        "const LAUNCH_TIMEOUT_MS = 30000;\nconst launchLocks = new Set();",
        1,
    )
    old_launch = """export async function launchOracleGame({ gameId, providerId, gameCode }) {
  let resolvedGameId = gameId;
  let resolvedProviderId = providerId;

  if ((!resolvedGameId || !resolvedProviderId) && gameCode) {
    const lookup = await lookupGameByCode(gameCode, { providerId: resolvedProviderId });
    resolvedGameId = lookup.id ?? lookup.gameId;
    resolvedProviderId = lookup.providerId ?? resolvedProviderId;
  }

  if (!resolvedGameId || !resolvedProviderId) {
    throw new Error('Game information is incomplete. Please refresh and try again.');
  }

  const start = await startGameSession({
    gameId: resolvedGameId,
    providerId: resolvedProviderId,
  });"""
    new_launch = """export async function launchOracleGame({ gameId, providerId, gameCode }) {
  let resolvedGameId = gameId;
  let resolvedProviderId = providerId;

  if ((!resolvedGameId || !resolvedProviderId) && gameCode) {
    const lookup = await lookupGameByCode(gameCode, { providerId: resolvedProviderId });
    resolvedGameId = lookup.id ?? lookup.gameId;
    resolvedProviderId = lookup.providerId ?? resolvedProviderId;
  }

  if (!resolvedGameId || !resolvedProviderId) {
    throw new Error('Game information is incomplete. Please refresh and try again.');
  }

  const launchLockKey = `${resolvedProviderId}:${resolvedGameId}`;
  if (launchLocks.has(launchLockKey)) {
    throw new Error('Game is already opening. Please wait a moment.');
  }
  launchLocks.add(launchLockKey);

  let start;
  try {
    start = await startGameSession({
      gameId: resolvedGameId,
      providerId: resolvedProviderId,
    });
  } catch (error) {
    launchLocks.delete(launchLockKey);
    throw error;
  }"""
    if old_launch in gws:
        gws = gws.replace(old_launch, new_launch, 1)
        gws = gws.replace(
            "  openGameUrl(launchUrl);\n  return start;\n}",
            "  try {\n    openGameUrl(launchUrl);\n    return start;\n  } finally {\n    window.setTimeout(() => launchLocks.delete(launchLockKey), 3000);\n  }\n}",
            1,
        )
        with sftp.open(GWS, 'w') as f:
            f.write(gws.encode('utf-8'))
        print('PATCH_OK gameWalletService launch lock')
    else:
        print('FAIL gameWalletService block not found')
else:
    print('SKIP gameWalletService already patched')

# 2) GameGrid.jsx - fix playingId key mismatch
GG = '/www/wwwroot/jowabuzz/frontend/src/components/GameGrid.jsx'
with sftp.open(GG, 'r') as f:
    gg = f.read().decode('utf-8').replace('\r\n', '\n')
if "setPlayingId(gameCode)" in gg:
    gg = gg.replace(
        """      const gameCode = game.code || game.id;
      setPlayingId(gameCode);""",
        """      const gameKey = game.gameId || `${game.providerId || 'p'}-${game.code || game.id}`;
      setPlayingId(gameKey);""",
        1,
    )
    with sftp.open(GG, 'w') as f:
        f.write(gg.encode('utf-8'))
    print('PATCH_OK GameGrid playingId key')
else:
    print('SKIP GameGrid')

# 3) PopularGames.jsx
PG = '/www/wwwroot/jowabuzz/frontend/src/components/PopularGames.jsx'
with sftp.open(PG, 'r') as f:
    pg = f.read().decode('utf-8').replace('\r\n', '\n')
if "setPlayingId(gameCode)" in pg:
    pg = pg.replace(
        """    const gameCode = game.code || game.id;
    setPlayingId(gameCode);""",
        """    const gameKey = game.gameId || `${game.providerId || 'p'}-${game.code || game.id}`;
    setPlayingId(gameKey);""",
        1,
    )
    with sftp.open(PG, 'w') as f:
        f.write(pg.encode('utf-8'))
    print('PATCH_OK PopularGames playingId key')
else:
    print('SKIP PopularGames')

sftp.close()

_, o, _ = c.exec_command('cd /www/wwwroot/jowabuzz/frontend && npm run build 2>&1', timeout=300000)
out = o.read().decode('utf-8', 'replace')
print(out[-2500:] if len(out) > 2500 else out)

c.close()
