#!/usr/bin/env node
/**
 * WinyPay integration smoke tests (no live API calls unless RUN_WINYPAY_LIVE=1).
 * Usage: node backend/scripts/test_winypay_integration.js
 */
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase, getPool } from '../config/db.js';
import {
  getWinypayConfig,
  isWinypayConfigured,
  migrateWinypaySchema,
  verifyWinypayCallbackSignature,
} from '../services/winypayService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function testConfig() {
  const config = getWinypayConfig();
  assert(config.baseUrl.includes('gopostman.com'), 'base URL should point to WinyPay');
  assert(config.depositCallbackUrl.includes('/api/payment/winypay/deposit-callback'), 'deposit callback URL');
  assert(config.withdrawCallbackUrl.includes('/api/payment/winypay/withdraw-callback'), 'withdraw callback URL');
  console.log('PASS config');
  console.log('  configured:', isWinypayConfigured());
  console.log('  merchant:', config.merchantCode ? `${config.merchantCode.slice(0, 3)}***` : '(empty)');
}

async function testSignature() {
  const secret = process.env.WINYPAY_SECRET_KEY || 'test-secret-key-for-unit-test';
  const body = JSON.stringify({
    status: 'success',
    amount: '100.00',
    user_id: '1',
    pay_type: 'bkash',
    order_id: 'DEP-test-1',
    transaction_id: 'DEP202604180405347755',
  });
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const original = process.env.WINYPAY_SECRET_KEY;
  process.env.WINYPAY_SECRET_KEY = secret;
  try {
    assert(verifyWinypayCallbackSignature(body, signature), 'signature should verify');
    assert(!verifyWinypayCallbackSignature(body, 'bad-signature'), 'bad signature should fail');
    console.log('PASS signature verification');
  } finally {
    if (original === undefined) delete process.env.WINYPAY_SECRET_KEY;
    else process.env.WINYPAY_SECRET_KEY = original;
  }
}

async function testSchema() {
  await connectDatabase();
  await migrateWinypaySchema();
  const pool = getPool();
  const [rows] = await pool.query(`SHOW TABLES LIKE 'winypay_payment_orders'`);
  assert(rows.length === 1, 'winypay_payment_orders table should exist');
  console.log('PASS schema migration');
}

async function main() {
  const results = [];
  for (const [name, fn] of [
    ['config', testConfig],
    ['signature', testSignature],
    ['schema', testSchema],
  ]) {
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (error) {
      console.error(`FAIL ${name}:`, error.message);
      results.push({ name, ok: false, error: error.message });
    }
  }

  const failed = results.filter((item) => !item.ok);
  if (failed.length) {
    process.exitCode = 1;
    console.error(`\n${failed.length} test(s) failed`);
  } else {
    console.log(`\nAll ${results.length} tests passed`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
