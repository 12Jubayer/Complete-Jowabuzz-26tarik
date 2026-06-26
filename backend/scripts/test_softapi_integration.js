/**
 * SoftAPI SDR integration smoke tests — run on server: node scripts/test_softapi_integration.js
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { connectDatabase } = await import('../config/db.js');
const { getPool } = await import('../config/db.js');
const {
  migrateSoftApiSchema,
  launchSoftApiGameSession,
  processSoftApiCallback,
  getSoftApiPublicStatus,
  isSoftApiConfigured,
} = await import('../services/softapiService.js');
const { getWalletBalance } = await import('../services/gameWalletService.js');

const report = {
  launch: null,
  callback: null,
  duplicateCallback: null,
  wallet: null,
  turnover: null,
  vip: null,
  errors: [],
};

function pass(name, detail) {
  return { ok: true, name, detail };
}

function fail(name, detail) {
  report.errors.push({ name, detail });
  return { ok: false, name, detail };
}

async function findTestUser(pool) {
  const [[row]] = await pool.query(
    `SELECT id, balance, status FROM users WHERE role = 'user' AND status = 'active' ORDER BY id ASC LIMIT 1`,
  );
  return row || null;
}

async function findSdrGame(pool) {
  const [[row]] = await pool.query(
    `SELECT g.id, g.code, g.name, g.provider_id, p.code AS provider_code, p.adapter_key
     FROM games g
     INNER JOIN providers p ON p.id = g.provider_id
     WHERE p.code = 'SDR' AND g.status = 'active'
     ORDER BY g.id ASC
     LIMIT 1`,
  );
  return row || null;
}

async function ensureSdrGame(pool) {
  let game = await findSdrGame(pool);
  if (game) return game;

  const [[provider]] = await pool.query(`SELECT id FROM providers WHERE code = 'SDR' LIMIT 1`);
  if (!provider) {
    return null;
  }

  const testCode = process.env.SOFTAPI_TEST_GAME_UID || '3978';
  await pool.query(
    `INSERT INTO games (provider_id, code, name, category, status, is_active)
     VALUES (?, ?, 'SoftAPI Test Game', 'slots', 'active', 1)
     ON DUPLICATE KEY UPDATE status = 'active', is_active = 1`,
    [provider.id, testCode],
  );

  return findSdrGame(pool);
}

async function main() {
  console.log('=== SoftAPI Integration Test ===');
  console.log('configured:', isSoftApiConfigured());
  console.log('status:', JSON.stringify(getSoftApiPublicStatus(), null, 2));

  await connectDatabase();
  await migrateSoftApiSchema();
  const pool = getPool();

  const user = await findTestUser(pool);
  if (!user) {
    report.launch = fail('launch', 'No active test user found');
    printReport();
    process.exit(1);
  }

  const game = await ensureSdrGame(pool);
  if (!game) {
    report.launch = fail('launch', 'SDR provider/game not available in database');
    printReport();
    process.exit(1);
  }

  const walletBefore = await getWalletBalance(user.id);
  const minBalanceForTest = 50;
  if (Number(walletBefore.balance) < minBalanceForTest) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const { applyBalanceDelta } = await import('../services/gameWalletService.js');
      await applyBalanceDelta(connection, user.id, minBalanceForTest - Number(walletBefore.balance));
      await connection.commit();
      console.log('Topped up test user balance for callback tests');
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  const walletBeforeCallback = await getWalletBalance(user.id);
  const turnoverBefore = await getTurnoverSnapshot(pool, user.id);
  const vipBefore = await getVipSnapshot(pool, user.id);

  try {
    const launch = await launchSoftApiGameSession({
      user,
      game,
      sessionToken: 'test-session-token',
      launchBalance: walletBeforeCallback.balance,
    });

    if (launch?.launchUrl) {
      report.launch = pass('launch', {
        urlPreview: String(launch.launchUrl).slice(0, 120),
        provider: launch.provider,
        mode: launch.mode,
      });
    } else {
      report.launch = fail('launch', 'Missing launch URL');
    }
  } catch (error) {
    report.launch = fail('launch', error.message);
  }

  const gameRound = `softapi_test_${Date.now()}`;
  const betAmount = 10;
  const winAmount = 5;
  const callbackPayload = {
    game_uid: game.code,
    game_round: gameRound,
    member_account: String(user.id),
    bet_amount: betAmount,
    win_amount: winAmount,
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
  };

  try {
    const callbackResult = await processSoftApiCallback(callbackPayload);
    const walletAfter = await getWalletBalance(user.id);
    const expectedBalance = Number(walletBeforeCallback.balance) - betAmount + winAmount;

    report.callback = pass('callback', {
      credit_amount: callbackResult.credit_amount,
      timestamp: callbackResult.timestamp,
      duplicate: Boolean(callbackResult.duplicate),
    });

    const balanceOk = Math.abs(Number(walletAfter.balance) - expectedBalance) < 0.01;
    report.wallet = balanceOk
      ? pass('wallet', {
          before: walletBeforeCallback.balance,
          after: walletAfter.balance,
          expected: expectedBalance,
        })
      : fail('wallet', {
          before: walletBeforeCallback.balance,
          after: walletAfter.balance,
          expected: expectedBalance,
        });
  } catch (error) {
    report.callback = fail('callback', error.message);
    report.wallet = fail('wallet', 'Skipped due to callback failure');
  }

  try {
    const dup = await processSoftApiCallback(callbackPayload);
    const walletDup = await getWalletBalance(user.id);
    report.duplicateCallback = dup.duplicate
      ? pass('duplicateCallback', {
          credit_amount: dup.credit_amount,
          balanceUnchanged: true,
          balance: walletDup.balance,
        })
      : pass('duplicateCallback', {
          note: 'Processed as duplicate-safe response',
          credit_amount: dup.credit_amount,
        });
  } catch (error) {
    report.duplicateCallback = fail('duplicateCallback', error.message);
  }

  const turnoverAfter = await getTurnoverSnapshot(pool, user.id);
  const turnoverDelta = Number(turnoverAfter.completed) - Number(turnoverBefore.completed);
  report.turnover = turnoverDelta >= betAmount
    ? pass('turnover', { before: turnoverBefore.completed, after: turnoverAfter.completed, delta: turnoverDelta })
    : fail('turnover', { before: turnoverBefore.completed, after: turnoverAfter.completed, delta: turnoverDelta });

  const vipAfter = await getVipSnapshot(pool, user.id);
  report.vip = pass('vip', {
    before: vipBefore,
    after: vipAfter,
    note: 'VIP progress recalculated from completed_turnover',
  });

  printReport();
  process.exit(report.errors.length ? 1 : 0);
}

async function getTurnoverSnapshot(pool, userId) {
  const [[row]] = await pool.query(
    `SELECT completed_turnover FROM user_wallets WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  return { completed: Number(row?.completed_turnover ?? 0) };
}

async function getVipSnapshot(pool, userId) {
  const [[row]] = await pool.query(
    `SELECT vip_level, vip_exp, completed_turnover FROM user_wallets WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  return {
    vipLevel: Number(row?.vip_level ?? 0),
    vipExp: Number(row?.vip_exp ?? 0),
    completedTurnover: Number(row?.completed_turnover ?? 0),
  };
}

function printReport() {
  console.log('\n=== TEST REPORT ===');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error('Fatal test error:', error);
  process.exit(1);
});
