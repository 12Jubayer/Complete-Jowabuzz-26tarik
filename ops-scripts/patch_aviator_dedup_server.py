"""Fix Aviator duplicate launch: in-flight dedup + response cache + mobile open."""
import paramiko
import sys
import time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

GAME_CTRL = '/www/wwwroot/jowabuzz/backend/controllers/gameController.js'
GWS = '/www/wwwroot/jowabuzz/frontend/src/services/gameWalletService.js'
PG = '/www/wwwroot/jowabuzz/frontend/src/components/PopularGames.jsx'
FG = '/www/wwwroot/jowabuzz/frontend/src/components/FeaturedGameCard.jsx'

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

# ===== BACKEND =====
with sftp.open(GAME_CTRL, 'r') as f:
    gc = f.read().decode('utf-8').replace('\r\n', '\n')
gc_orig = gc

if 'launchResponseCache' not in gc:
    gc = gc.replace(
        "function sleep(ms) {\n  return new Promise((resolve) => setTimeout(resolve, ms));\n}",
        """function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const inFlightLaunches = new Map();
const launchResponseCache = new Map();
const launchMutex = new Set();
const SPRIBE_LAUNCH_CACHE_MS = Number(process.env.SPRIBE_LAUNCH_CACHE_MS || 60000);""",
        1,
    )
    print('PATCH_OK backend cache maps')
else:
    print('SKIP backend cache maps')

# Replace startGame header to add mutex/cache before any await
old_start = """export async function startGame(req, res) {
  const pool = getPool();
  const userId = getUserId(req);
  const requestStartedAt = Date.now();

  console.log('[Game Start] request', {
    userId,
    gameId: req.body?.gameId,
    providerId: req.body?.providerId,
  });"""

new_start = """export async function startGame(req, res) {
  const pool = getPool();
  const userId = getUserId(req);
  const requestStartedAt = Date.now();
  const bodyGameId = Number(req.body?.gameId);
  const earlyGuardKey = bodyGameId ? buildLaunchGuardKey(userId, bodyGameId) : '';

  if (earlyGuardKey) {
    const cached = launchResponseCache.get(earlyGuardKey);
    if (cached && Date.now() < cached.expires) {
      console.log('[Game Start] cache hit', { userId, gameId: bodyGameId });
      return res.json(cached.payload);
    }
    if (inFlightLaunches.has(earlyGuardKey)) {
      console.log('[Game Start] await in-flight', { userId, gameId: bodyGameId });
      try {
        return res.json(await inFlightLaunches.get(earlyGuardKey));
      } catch (error) {
        return res.status(error.statusCode || 502).json({
          error: error.message || 'Failed to launch game. Please try again.',
        });
      }
    }
    if (launchMutex.has(earlyGuardKey)) {
      for (let attempt = 0; attempt < 120; attempt += 1) {
        await sleep(100);
        const hit = launchResponseCache.get(earlyGuardKey);
        if (hit && Date.now() < hit.expires) {
          console.log('[Game Start] cache hit after wait', { userId, gameId: bodyGameId });
          return res.json(hit.payload);
        }
        if (!launchMutex.has(earlyGuardKey) && !inFlightLaunches.has(earlyGuardKey)) break;
      }
      return res.status(429).json({
        error: 'Game is already opening. Please wait a moment and try again.',
      });
    }
    launchMutex.add(earlyGuardKey);
  }

  let settleLaunch = null;
  const launchSlot = earlyGuardKey
    ? new Promise((resolve, reject) => {
        settleLaunch = { resolve, reject };
      })
    : null;
  if (earlyGuardKey) inFlightLaunches.set(earlyGuardKey, launchSlot);

  const failLaunch = (status, message) => {
    if (settleLaunch) {
      const error = new Error(message);
      error.statusCode = status;
      settleLaunch.reject(error);
      inFlightLaunches.delete(earlyGuardKey);
      launchMutex.delete(earlyGuardKey);
    }
    return res.status(status).json({ error: message });
  };

  const succeedLaunch = (payload) => {
    if (earlyGuardKey) {
      launchResponseCache.set(earlyGuardKey, {
        payload,
        expires: Date.now() + SPRIBE_LAUNCH_CACHE_MS,
      });
      settleLaunch.resolve(payload);
      setTimeout(() => {
        inFlightLaunches.delete(earlyGuardKey);
        launchMutex.delete(earlyGuardKey);
      }, 5000);
    }
    return res.json(payload);
  };

  console.log('[Game Start] request', {
    userId,
    gameId: req.body?.gameId,
    providerId: req.body?.providerId,
  });"""

if 'earlyGuardKey' not in gc and old_start in gc:
    gc = gc.replace(old_start, new_start, 1)
    print('PATCH_OK startGame header')
elif 'earlyGuardKey' in gc:
    print('SKIP startGame header')
else:
    print('FAIL startGame header')

# Route early errors through failLaunch
gc = gc.replace(
    "  if (lookup.error) {\n    return res.status(lookup.status).json({ error: lookup.error });\n  }",
    "  if (lookup.error) {\n    return failLaunch(lookup.status, lookup.error);\n  }",
    1,
)
gc = gc.replace(
    "  if (!usesSeamlessProvider && !(await isGamesPlayEnabled())) {\n    return res.status(503).json({ error: 'Games are temporarily unavailable' });\n  }",
    "  if (!usesSeamlessProvider && !(await isGamesPlayEnabled())) {\n    return failLaunch(503, 'Games are temporarily unavailable');\n  }",
    1,
)
gc = gc.replace(
    "  if (!user || user.status !== 'active') {\n    return res.status(403).json({ error: 'User account is not active' });\n  }",
    "  if (!user || user.status !== 'active') {\n    return failLaunch(403, 'User account is not active');\n  }",
    1,
)

# Remove old timestamp-only guard block (replaced by new system)
old_guard = """
  const launchGuardKey = buildLaunchGuardKey(userId, game.id);
  const lastLaunchAt = recentGameLaunches.get(launchGuardKey) || 0;
  if (Date.now() - lastLaunchAt < GAME_LAUNCH_COOLDOWN_MS) {
    return res.status(429).json({
      error: 'Game is already opening. Please wait a moment and try again.',
    });
  }
  recentGameLaunches.set(launchGuardKey, Date.now());

  if (isSingleSessionProvider(game.provider_code, game)) {"""
new_guard = """  if (isSingleSessionProvider(game.provider_code, game)) {"""
if old_guard in gc:
    gc = gc.replace(old_guard, new_guard, 1)
    print('PATCH_OK removed old guard')

gc = gc.replace(
    "    await sleep(Number(process.env.SPRIBE_LAUNCH_DELAY_MS || 700));",
    "    await sleep(Number(process.env.SPRIBE_LAUNCH_DELAY_MS || 2000));",
    1,
)

gc = gc.replace(
    """    return res.status(error.statusCode || 502).json({
      error: error.message || 'Failed to launch game. Please try again.',
    });
  }

  const launchUrl = providerPayload?.launchUrl;
  if (!launchUrl) {
    console.error('[Game Start] missing launchUrl', {
      userId,
      gameCode: game.code,
      providerCode: game.provider_code,
      providerPayload,
    });
    return res.status(502).json({
      error: 'Game launch URL not received from provider. Please try again.',
    });
  }""",
    """    return failLaunch(error.statusCode || 502, error.message || 'Failed to launch game. Please try again.');
  }

  const launchUrl = providerPayload?.launchUrl;
  if (!launchUrl) {
    console.error('[Game Start] missing launchUrl', {
      userId,
      gameCode: game.code,
      providerCode: game.provider_code,
      providerPayload,
    });
    return failLaunch(502, 'Game launch URL not received from provider. Please try again.');
  }""",
    1,
)

old_success_return = """    return res.json({
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

new_success_return = """    return succeedLaunch({
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

if 'succeedLaunch' not in gc.split('export async function submitGameResult')[0]:
    gc = gc.replace(old_success_return, new_success_return, 1)
    print('PATCH_OK succeedLaunch')

gc = gc.replace(
    """    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to start game session',
    });
  } finally {
    connection.release();
  }
}""",
    """    return failLaunch(error.statusCode || 500, error.message || 'Failed to start game session');
  } finally {
    connection.release();
  }
}""",
    1,
)

if gc != gc_orig:
    with sftp.open(GAME_CTRL, 'w') as f:
        f.write(gc.encode('utf-8'))
    print('WROTE gameController.js')
else:
    print('NO backend changes')

# ===== FRONTEND =====
with sftp.open(GWS, 'r') as f:
    gws = f.read().decode('utf-8').replace('\r\n', '\n')
gws_orig = gws

old_open = """function openGameUrl(launchUrl) {
  const popup = window.open(launchUrl, '_blank', 'noopener,noreferrer');
  if (!popup) {
    window.location.assign(launchUrl);
  }
}"""

new_open = """function isMobileClient() {
  return /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(navigator.userAgent || '');
}

let lastOpenedLaunchUrl = '';
let lastOpenedAt = 0;

function openGameUrl(launchUrl) {
  const now = Date.now();
  if (launchUrl === lastOpenedLaunchUrl && now - lastOpenedAt < 5000) {
    return;
  }
  lastOpenedLaunchUrl = launchUrl;
  lastOpenedAt = now;

  if (isMobileClient()) {
    window.location.assign(launchUrl);
    return;
  }

  const popup = window.open(launchUrl, '_blank', 'noopener,noreferrer');
  if (!popup) {
    window.location.assign(launchUrl);
  }
}"""

if old_open in gws:
    gws = gws.replace(old_open, new_open, 1)
    print('PATCH_OK openGameUrl mobile')

# Move lock before lookup
old_launch_head = """export async function launchOracleGame({ gameId, providerId, gameCode }) {
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
  launchLocks.add(launchLockKey);"""

new_launch_head = """export async function launchOracleGame({ gameId, providerId, gameCode }) {
  const provisionalLockKey = gameId && providerId
    ? `${providerId}:${gameId}`
    : (gameCode ? `code:${gameCode}:${providerId || 'any'}` : '');

  if (provisionalLockKey && launchLocks.has(provisionalLockKey)) {
    throw new Error('Game is already opening. Please wait a moment.');
  }
  if (provisionalLockKey) launchLocks.add(provisionalLockKey);

  let resolvedGameId = gameId;
  let resolvedProviderId = providerId;

  try {
    if ((!resolvedGameId || !resolvedProviderId) && gameCode) {
      const lookup = await lookupGameByCode(gameCode, { providerId: resolvedProviderId });
      resolvedGameId = lookup.id ?? lookup.gameId;
      resolvedProviderId = lookup.providerId ?? resolvedProviderId;
    }

    if (!resolvedGameId || !resolvedProviderId) {
      throw new Error('Game information is incomplete. Please refresh and try again.');
    }
  } catch (error) {
    if (provisionalLockKey) launchLocks.delete(provisionalLockKey);
    throw error;
  }

  const launchLockKey = `${resolvedProviderId}:${resolvedGameId}`;
  if (provisionalLockKey !== launchLockKey) {
    if (launchLocks.has(launchLockKey)) {
      if (provisionalLockKey) launchLocks.delete(provisionalLockKey);
      throw new Error('Game is already opening. Please wait a moment.');
    }
    if (provisionalLockKey) launchLocks.delete(provisionalLockKey);
    launchLocks.add(launchLockKey);
  }"""

if 'provisionalLockKey' not in gws and old_launch_head in gws:
    gws = gws.replace(old_launch_head, new_launch_head, 1)
    print('PATCH_OK launch lock before lookup')

if gws != gws_orig:
    with sftp.open(GWS, 'w') as f:
        f.write(gws.encode('utf-8'))

for path, label in [(PG, 'PopularGames'), (FG, 'FeaturedGameCard')]:
    with sftp.open(path, 'r') as f:
        txt = f.read().decode('utf-8').replace('\r\n', '\n')
    changed = False
    if 'setPlayingId(gameCode)' in txt:
        txt = txt.replace(
            'const gameCode = game.code || game.id;\n      setPlayingId(gameCode);',
            "const gameKey = game.gameId || `${game.providerId || 'p'}-${game.code || game.id}`;\n      setPlayingId(gameKey);",
            1,
        )
        changed = True
    if 'const gameKey = game.code || game.id;' in txt and 'game.gameId ||' not in txt.split('disabled')[1][:200]:
        txt = txt.replace(
            'const gameKey = game.code || game.id;',
            "const gameKey = game.gameId || `${game.providerId || 'p'}-${game.code || game.id}`;",
            1,
        )
        changed = True
    if changed:
        with sftp.open(path, 'w') as f:
            f.write(txt.encode('utf-8'))
        print(f'PATCH_OK {label}')

sftp.close()

_, o, _ = c.exec_command(
    "grep -q '^SPRIBE_LAUNCH_DELAY_MS=' /www/wwwroot/jowabuzz/backend/.env || "
    "echo 'SPRIBE_LAUNCH_DELAY_MS=2000' >> /www/wwwroot/jowabuzz/backend/.env",
    timeout=20,
)
o.read()

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30000)
print(o.read().decode('utf-8', 'replace')[:250])
time.sleep(3)

_, o, _ = c.exec_command('cd /www/wwwroot/jowabuzz/frontend && npm run build 2>&1 | tail -5', timeout=300000)
print(o.read().decode('utf-8', 'replace'))

c.close()
print('DONE')
