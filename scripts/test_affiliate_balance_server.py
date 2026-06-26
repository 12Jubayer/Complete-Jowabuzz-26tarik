#!/usr/bin/env python3
"""Run affiliate balance logic tests on server."""
import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

TEST = r"""
set -e
cd /www/wwwroot/jowabuzz/backend

node --input-type=module << 'EOF'
import dotenv from 'dotenv';
dotenv.config({ path: '/www/wwwroot/jowabuzz/backend/.env' });
import { connectDatabase, getPool } from './config/db.js';
import {
  migrateAffiliateBalanceSchema,
  applyReferralGameProfitLoss,
  getAffiliateBalanceSnapshot,
  syncAvailableToPendingSettlement,
  AFFILIATE_PENDING_THRESHOLD,
} from './services/affiliateBalanceService.js';

await connectDatabase();
await migrateAffiliateBalanceSchema();
const pool = getPool();

// Find approved affiliate with a referred user
const [[affiliate]] = await pool.query(
  `SELECT ap.id AS affiliate_id, child.user_id AS referral_user_id, ap.commission_percent
   FROM affiliate_profiles ap
   INNER JOIN affiliate_profiles child ON child.referred_by = ap.id
   WHERE ap.status = 'approved'
   LIMIT 1`
);

if (!affiliate) {
  console.log(JSON.stringify({ skip: true, reason: 'No affiliate with referral found' }));
  process.exit(0);
}

const affiliateId = affiliate.referral_user_id ? affiliate.affiliate_id : affiliate.affiliate_id;
const referralUserId = affiliate.referral_user_id;

// Reset test balances for affiliate
await pool.query(
  `UPDATE affiliate_profiles SET available_balance=0, pending_settlement_balance=0, total_settlement_balance=0 WHERE id=?`,
  [affiliate.affiliate_id]
);

// Test 1: user loss increases available
await applyReferralGameProfitLoss(referralUserId, -1000);
let b = await getAffiliateBalanceSnapshot(affiliate.affiliate_id);
const lossCommission = Number(((1000 * affiliate.commission_percent) / 100).toFixed(2));
console.log('TEST1_user_loss:', b.availableBalance === lossCommission ? 'PASS' : 'FAIL', b);

// Test 2: user win decreases available
await applyReferralGameProfitLoss(referralUserId, 500);
b = await getAffiliateBalanceSnapshot(affiliate.affiliate_id);
const expectedAfterWin = Number((lossCommission - (500 * affiliate.commission_percent / 100)).toFixed(2));
console.log('TEST2_user_win:', b.availableBalance === expectedAfterWin ? 'PASS' : 'FAIL', b);

// Test 3: below threshold pending is 0
await pool.query(`UPDATE affiliate_profiles SET available_balance=1500, pending_settlement_balance=0 WHERE id=?`, [affiliate.affiliate_id]);
const conn = await pool.getConnection();
await conn.beginTransaction();
await syncAvailableToPendingSettlement(affiliate.affiliate_id, conn);
await conn.commit();
conn.release();
b = await getAffiliateBalanceSnapshot(affiliate.affiliate_id);
console.log('TEST3_pending_zero_below_2000:', b.pendingBalance === 0 && b.availableBalance === 1500 ? 'PASS' : 'FAIL', b);

// Test 4: at 2000+ creates pending settlement
await pool.query(`UPDATE affiliate_profiles SET available_balance=2500, pending_settlement_balance=0 WHERE id=?`, [affiliate.affiliate_id]);
const conn2 = await pool.getConnection();
await conn2.beginTransaction();
await syncAvailableToPendingSettlement(affiliate.affiliate_id, conn2);
await conn2.commit();
conn2.release();
b = await getAffiliateBalanceSnapshot(affiliate.affiliate_id);
const [[pendingSettlement]] = await pool.query(
  `SELECT id, total_commission, settlement_source, status FROM affiliate_settlements
   WHERE affiliate_id=? AND settlement_source='available_balance' AND status='pending' ORDER BY id DESC LIMIT 1`,
  [affiliate.affiliate_id]
);
console.log('TEST4_pending_at_2000:', b.pendingBalance >= AFFILIATE_PENDING_THRESHOLD && pendingSettlement ? 'PASS' : 'FAIL', b, pendingSettlement);

console.log('THRESHOLD:', AFFILIATE_PENDING_THRESHOLD);
process.exit(0);
EOF
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, e = c.exec_command(TEST, timeout=120)
print(o.read().decode('utf-8', errors='replace'))
print(e.read().decode('utf-8', errors='replace'))
c.close()
