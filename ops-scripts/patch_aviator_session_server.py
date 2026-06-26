"""Fix Aviator/Spribe 'Session ended' error on production server only."""
import paramiko
import sys
import time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

GAME_CTRL = '/www/wwwroot/jowabuzz/backend/controllers/gameController.js'
HMK_SVC = '/www/wwwroot/jowabuzz/backend/services/hmkApiService.js'

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

# --- Patch gameController.js ---
with sftp.open(GAME_CTRL, 'r') as f:
    gc = f.read().decode('utf-8').replace('\r\n', '\n')
gc_orig = gc

guard_helpers = """
const recentGameLaunches = new Map();
const GAME_LAUNCH_COOLDOWN_MS = Number(process.env.GAME_LAUNCH_COOLDOWN_MS || 8000);

function buildLaunchGuardKey(userId, gameId) {
  return `${userId}:${gameId}`;
}

function isSingleSessionProvider(providerCode = '', game = {}) {
  const provider = String(providerCode || '').trim().toUpperCase();
  const category = String(game.category || game.game_type || '').trim().toLowerCase();
  return provider === 'SPRIBE' || category === 'crash';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
"""

if 'recentGameLaunches' not in gc:
    gc = gc.replace(
        "function getUserId(req) {",
        guard_helpers + "\nfunction getUserId(req) {",
        1,
    )
    print('PATCH_OK gameController helpers')
else:
    print('SKIP gameController helpers already present')

guard_block = """
  const launchGuardKey = buildLaunchGuardKey(userId, game.id);
  const lastLaunchAt = recentGameLaunches.get(launchGuardKey) || 0;
  if (Date.now() - lastLaunchAt < GAME_LAUNCH_COOLDOWN_MS) {
    return res.status(429).json({
      error: 'Game is already opening. Please wait a moment and try again.',
    });
  }
  recentGameLaunches.set(launchGuardKey, Date.now());

  if (isSingleSessionProvider(game.provider_code, game)) {
    await pool.query(
      `UPDATE game_sessions
       SET status = 'closed', ended_at = NOW()
       WHERE user_id = ? AND status = 'active'`,
      [userId],
    );
    await sleep(Number(process.env.SPRIBE_LAUNCH_DELAY_MS || 700));
  }
"""

anchor = "  if (!user || user.status !== 'active') {\n    return res.status(403).json({ error: 'User account is not active' });\n  }\n\n  const identity = await resolveOraclePlayerIdentity(user);"
if 'launchGuardKey' not in gc and anchor in gc:
    gc = gc.replace(anchor, anchor.replace(
        "  const identity = await resolveOraclePlayerIdentity(user);",
        guard_block + "\n  const identity = await resolveOraclePlayerIdentity(user);",
    ), 1)
    print('PATCH_OK gameController launch guard')
elif 'launchGuardKey' in gc:
    print('SKIP gameController launch guard already present')
else:
    print('FAIL gameController anchor not found')

if gc != gc_orig:
    with sftp.open(GAME_CTRL, 'w') as f:
        f.write(gc.encode('utf-8'))

# --- Patch hmkApiService.js ---
with sftp.open(HMK_SVC, 'r') as f:
    hmk = f.read().decode('utf-8').replace('\r\n', '\n')
hmk_orig = hmk

old_payload = """    const payload = {
      user_id: memberAccount,
      balance,
      money: balance,
      amount: balance,
      game_uid: gameUid,
      token: config.token,
      timestamp: Date.now(),
      return: config.returnUrl,
      callback: config.callbackUrl,
      currency_code: config.currency,
      language: config.language,
    };"""

new_payload = """    const providerCode = trim(game.provider_code || game.providerCode).toUpperCase();
    const launchPlatform = trim(process.env.HMK_LAUNCH_PLATFORM) || 'mobile';
    const payload = {
      user_id: memberAccount,
      balance,
      money: balance,
      amount: balance,
      game_uid: gameUid,
      token: config.token,
      timestamp: Date.now(),
      return: config.returnUrl,
      callback: config.callbackUrl,
      currency_code: config.currency,
      language: config.language,
      session_id: sessionToken,
      session_token: sessionToken,
      platform: providerCode === 'SPRIBE' ? launchPlatform : undefined,
    };
    if (!payload.platform) delete payload.platform;"""

if old_payload in hmk:
    hmk = hmk.replace(old_payload, new_payload, 1)
    print('PATCH_OK hmkApiService launch payload')
elif 'session_id: sessionToken' in hmk:
    print('SKIP hmkApiService payload already patched')
else:
    print('FAIL hmkApiService payload block not found')

if hmk != hmk_orig:
    with sftp.open(HMK_SVC, 'w') as f:
        f.write(hmk.encode('utf-8'))

sftp.close()

# Ensure env defaults
_, o, _ = c.exec_command(
    "grep -q '^HMK_LAUNCH_PLATFORM=' /www/wwwroot/jowabuzz/backend/.env || "
    "echo 'HMK_LAUNCH_PLATFORM=mobile' >> /www/wwwroot/jowabuzz/backend/.env",
    timeout=20,
)
o.read()

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30000)
print(o.read().decode('utf-8', 'replace')[:300])
time.sleep(4)

# Test double launch + single launch URL platform
script = r'''
cd /www/wwwroot/jowabuzz/backend && node <<'NODE'
import 'dotenv/config';
import mysql from 'mysql2/promise';
import { launchHmkGameSession } from './services/hmkApiService.js';

const pool = mysql.createPool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
});
const [[user]] = await pool.query("SELECT id, name, phone, balance, status FROM users WHERE status='active' ORDER BY id LIMIT 1");
const [[game]] = await pool.query(`
  SELECT g.id, g.code, g.name, g.category, g.game_type, p.code AS provider_code, p.adapter_key
  FROM games g JOIN providers p ON p.id=g.provider_id
  WHERE p.code='SPRIBE' AND g.name='Aviator' LIMIT 1`);
const r = await launchHmkGameSession({ user, game, sessionToken: 'probe_' + Date.now(), launchBalance: user.balance });
console.log('url', r.launchUrl);
console.log('has_mobile', /platform=mobile/i.test(r.launchUrl));
await pool.end();
NODE
'''
_, o, e = c.exec_command(script, timeout=120)
print(o.read().decode('utf-8', 'replace'))
err = e.read().decode('utf-8', 'replace')
if err:
    print('ERR', err[:1500])

c.close()
print('DONE')
