/**
 * Withdraw channel lock integration tests.
 * Run: node scripts/test_withdraw_channel.js
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { connectDatabase } = await import('../config/db.js');
const { getPool } = await import('../config/db.js');
const {
  migrateWithdrawChannelSchema,
  setWithdrawChannelOnFirstDeposit,
  assertWithdrawChannelForAgent,
  assertWithdrawChannelForPayment,
  adminUpdateWithdrawChannel,
  WITHDRAW_CHANNEL,
  WITHDRAW_CHANNEL_MESSAGES,
} = await import('../services/withdrawChannelService.js');
const { applyBalanceDelta } = await import('../services/gameWalletService.js');

const report = { tests: [], errors: [] };

function pass(name, detail = {}) {
  report.tests.push({ ok: true, name, detail });
}

function fail(name, detail = {}) {
  report.errors.push({ name, detail });
  report.tests.push({ ok: false, name, detail });
}

async function createTestUser(pool, suffix) {
  const phone = `0199${String(Date.now()).slice(-7)}${suffix}`;
  const [result] = await pool.query(
    `INSERT INTO users (name, phone, email, password_hash, role, status, balance)
     VALUES (?, ?, ?, 'test_hash', 'user', 'active', 100)`,
    [`Channel Test ${suffix}`, phone, `${phone}@test.jowabuzz.app`],
  );
  return result.insertId;
}

async function resetChannel(pool, userId) {
  await pool.query(`UPDATE users SET withdraw_channel = NULL WHERE id = ?`, [userId]);
  await pool.query(`DELETE FROM withdraw_channel_logs WHERE user_id = ?`, [userId]);
}

async function run() {
  await connectDatabase();
  await migrateWithdrawChannelSchema();
  const pool = getPool();

  const userAgent = await createTestUser(pool, 'A');
  const userPayment = await createTestUser(pool, 'P');
  const userMixedAgent = await createTestUser(pool, 'M');
  const userMixedPayment = await createTestUser(pool, 'N');
  const userAdmin = await createTestUser(pool, 'D');

  // 1. Agent deposit -> agent withdraw PASS
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await resetChannel(connection, userAgent);
      await setWithdrawChannelOnFirstDeposit(connection, {
        userId: userAgent,
        depositType: WITHDRAW_CHANNEL.AGENT,
        depositId: 1001,
      });
      await assertWithdrawChannelForAgent(connection, userAgent);
      await connection.commit();
      pass('agent_deposit_agent_withdraw');
    } catch (error) {
      await connection.rollback();
      fail('agent_deposit_agent_withdraw', error.message);
    } finally {
      connection.release();
    }
  } catch (error) {
    fail('agent_deposit_agent_withdraw', error.message);
  }

  // 2. Payment deposit -> payment withdraw PASS
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await resetChannel(connection, userPayment);
      await setWithdrawChannelOnFirstDeposit(connection, {
        userId: userPayment,
        depositType: WITHDRAW_CHANNEL.PAYMENT,
        depositId: 2001,
      });
      await assertWithdrawChannelForPayment(connection, userPayment);
      await connection.commit();
      pass('payment_deposit_payment_withdraw');
    } catch (error) {
      await connection.rollback();
      fail('payment_deposit_payment_withdraw', error.message);
    } finally {
      connection.release();
    }
  } catch (error) {
    fail('payment_deposit_payment_withdraw', error.message);
  }

  // 3. Agent deposit -> payment withdraw FAIL
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await resetChannel(connection, userAgent);
      await setWithdrawChannelOnFirstDeposit(connection, {
        userId: userAgent,
        depositType: WITHDRAW_CHANNEL.AGENT,
        depositId: 1002,
      });
      await assertWithdrawChannelForPayment(connection, userAgent);
      await connection.rollback();
      fail('agent_deposit_payment_withdraw_should_fail', 'Expected rejection');
    } catch (error) {
      await connection.rollback();
      if (error.message === WITHDRAW_CHANNEL_MESSAGES.AGENT_ONLY) {
        pass('agent_deposit_payment_withdraw_should_fail');
      } else {
        fail('agent_deposit_payment_withdraw_should_fail', error.message);
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    fail('agent_deposit_payment_withdraw_should_fail', error.message);
  }

  // 4. Payment deposit -> agent withdraw FAIL
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await resetChannel(connection, userPayment);
      await setWithdrawChannelOnFirstDeposit(connection, {
        userId: userPayment,
        depositType: WITHDRAW_CHANNEL.PAYMENT,
        depositId: 2002,
      });
      await assertWithdrawChannelForAgent(connection, userPayment);
      await connection.rollback();
      fail('payment_deposit_agent_withdraw_should_fail', 'Expected rejection');
    } catch (error) {
      await connection.rollback();
      if (error.message === WITHDRAW_CHANNEL_MESSAGES.PAYMENT_ONLY) {
        pass('payment_deposit_agent_withdraw_should_fail');
      } else {
        fail('payment_deposit_agent_withdraw_should_fail', error.message);
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    fail('payment_deposit_agent_withdraw_should_fail', error.message);
  }

  // 5. Mixed deposit channel AGENT withdraw PASS
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await resetChannel(connection, userMixedAgent);
      await setWithdrawChannelOnFirstDeposit(connection, {
        userId: userMixedAgent,
        depositType: WITHDRAW_CHANNEL.AGENT,
        depositId: 3001,
      });
      await setWithdrawChannelOnFirstDeposit(connection, {
        userId: userMixedAgent,
        depositType: WITHDRAW_CHANNEL.PAYMENT,
        depositId: 3002,
      });
      await assertWithdrawChannelForAgent(connection, userMixedAgent);
      await connection.commit();
      pass('mixed_deposit_agent_channel_agent_withdraw');
    } catch (error) {
      await connection.rollback();
      fail('mixed_deposit_agent_channel_agent_withdraw', error.message);
    } finally {
      connection.release();
    }
  } catch (error) {
    fail('mixed_deposit_agent_channel_agent_withdraw', error.message);
  }

  // 6. Mixed deposit channel PAYMENT withdraw PASS
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await resetChannel(connection, userMixedPayment);
      await setWithdrawChannelOnFirstDeposit(connection, {
        userId: userMixedPayment,
        depositType: WITHDRAW_CHANNEL.PAYMENT,
        depositId: 4001,
      });
      await setWithdrawChannelOnFirstDeposit(connection, {
        userId: userMixedPayment,
        depositType: WITHDRAW_CHANNEL.AGENT,
        depositId: 4002,
      });
      await assertWithdrawChannelForPayment(connection, userMixedPayment);
      await connection.commit();
      pass('mixed_deposit_payment_channel_payment_withdraw');
    } catch (error) {
      await connection.rollback();
      fail('mixed_deposit_payment_channel_payment_withdraw', error.message);
    } finally {
      connection.release();
    }
  } catch (error) {
    fail('mixed_deposit_payment_withdraw', error.message);
  }

  // 7. Admin manual change PASS
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await resetChannel(connection, userAdmin);
      await setWithdrawChannelOnFirstDeposit(connection, {
        userId: userAdmin,
        depositType: WITHDRAW_CHANNEL.AGENT,
        depositId: 5001,
      });
      const changed = await adminUpdateWithdrawChannel(connection, {
        userId: userAdmin,
        newChannel: WITHDRAW_CHANNEL.PAYMENT,
        adminId: 1,
      });
      await assertWithdrawChannelForPayment(connection, userAdmin);
      await connection.commit();
      pass('admin_manual_change', changed);
    } catch (error) {
      await connection.rollback();
      fail('admin_manual_change', error.message);
    } finally {
      connection.release();
    }
  } catch (error) {
    fail('admin_manual_change', error.message);
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.errors.length ? 1 : 0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
