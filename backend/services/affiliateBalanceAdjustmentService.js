import { getPool } from '../config/db.js';
import { logAdminAudit } from './adminPlayerService.js';
import {
  creditAffiliateUserBalance,
  debitAffiliateUserBalance,
} from './affiliateUserBalanceService.js';

const DEFAULT_REASON = 'Manual balance adjustment by admin';

export async function applyAdminAffiliateBalanceAdjustment({
  affiliateId,
  type,
  amount,
  reason = DEFAULT_REASON,
  adminId = null,
  ipAddress = null,
  connection = null,
}) {
  const pool = connection || getPool();
  const ownConnection = !connection;
  const db = ownConnection ? await pool.getConnection() : connection;
  const delta = type === 'add' ? amount : -amount;
  const txType = type === 'add' ? 'add' : 'deduct';
  const note = String(reason || '').trim() || DEFAULT_REASON;

  try {
    if (ownConnection) {
      await db.beginTransaction();
    }

    const [[affiliate]] = await db.query(
      `SELECT id, user_id, settled_commission, total_commission, status
       FROM affiliate_profiles
       WHERE id = ?
       FOR UPDATE`,
      [affiliateId],
    );

    if (!affiliate) {
      if (ownConnection) await db.rollback();
      const error = new Error('Affiliate not found');
      error.statusCode = 404;
      throw error;
    }

    const nextSettled = Number(affiliate.settled_commission) + delta;
    if (nextSettled < 0) {
      if (ownConnection) await db.rollback();
      const error = new Error('Insufficient affiliate balance');
      error.statusCode = 400;
      throw error;
    }

    const nextTotal = Math.max(0, Number(affiliate.total_commission || 0) + delta);

    await db.query(
      `UPDATE affiliate_profiles
       SET settled_commission = ?, total_commission = ?
       WHERE id = ?`,
      [nextSettled, nextTotal, affiliateId],
    );

    if (type === 'add') {
      await creditAffiliateUserBalance(affiliate.user_id, amount, db);
    } else {
      await debitAffiliateUserBalance(affiliate.user_id, amount, db);
    }

    const [txResult] = await db.query(
      `INSERT INTO affiliate_transactions (affiliate_id, type, amount, reason, status)
       VALUES (?, ?, ?, ?, 'completed')`,
      [affiliateId, txType, amount, note],
    );

    await logAdminAudit(db, {
      adminId,
      userId: affiliate.user_id,
      action: 'affiliate_balance_adjust',
      details: {
        affiliateId,
        type,
        amount,
        reason: note,
        settledCommission: nextSettled,
        totalCommission: nextTotal,
      },
      ipAddress,
    });

    if (ownConnection) {
      await db.commit();
    }

    return {
      success: true,
      transactionId: txResult.insertId,
      settledCommission: nextSettled,
      totalCommission: nextTotal,
      reason: note,
    };
  } catch (error) {
    if (ownConnection) {
      await db.rollback();
    }
    throw error;
  } finally {
    if (ownConnection) {
      db.release();
    }
  }
}
