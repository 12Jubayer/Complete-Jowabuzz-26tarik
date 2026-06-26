import { getPool } from '../config/db.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import {
  addRequiredTurnover,
  ensureUserWallet,
  isTurnoverComplete,
  resolveEffectiveTurnover,
  syncWalletBalance,
} from '../services/userWalletService.js';
import { getVipProgress, processUserVipProgress } from '../services/vipLevelService.js';
import { listUserBonusClaims } from '../services/bonusTurnoverService.js';
import {
  getUserBonusWalletSummary,
  hasLockedBonusProgress,
  listUserBonusProgress,
} from '../services/bonusUserProgressService.js';
import { getUserDepositBonusStatus, hasLockedDepositBonus } from '../services/depositBonusService.js';
import {
  ensureProviderUsername,
  providerUsernameCollidesWithPhone,
} from '../services/providerUsernameService.js';
import {
  validateDepositAmount,
  validateWithdrawAmount,
} from '../services/generalSettingsService.js';
import {
  enforceBonusTurnoverForWithdraw,
  enforceTurnoverForWithdraw,
} from '../services/withdrawEligibilityService.js';
import { createDepositIntent } from '../services/paymentGatewayService.js';
import { getActivePaymentGatewayConfig } from '../services/paymentGatewayConfig.js';
import { forwardWithdrawToPaymentGateway } from '../services/paymentWithdrawGatewayService.js';
import { assertPlayerCanWithdraw } from '../services/playerWithdrawGuardService.js';
import {
  assertWithdrawChannelForPayment,
  getUserWithdrawChannel,
} from '../services/withdrawChannelService.js';

function getUserId(req) {
  return Number(req.user?.sub);
}

async function ensureActivePlayerAccount(userId, res) {
  const pool = getPool();
  const [[user]] = await pool.query(`SELECT status FROM users WHERE id = ? LIMIT 1`, [userId]);
  if (!user || user.status === 'deleted') {
    res.status(403).json({ error: 'Account is not available' });
    return false;
  }
  if (user.status === 'suspended') {
    res.status(403).json({ error: 'Account is suspended' });
    return false;
  }
  if (user.status !== 'active') {
    res.status(403).json({ error: 'Account is not active' });
    return false;
  }
  return true;
}

async function fetchUserProfile(userId) {
  const pool = getPool();
  const [[user]] = await pool.query(
    `SELECT id, name, phone, email, balance, status, created_at, provider_username, withdraw_channel
     FROM users WHERE id = ? AND role = 'user' LIMIT 1`,
    [userId],
  );
  if (!user) return null;

  let providerUsername = String(user.provider_username || '').trim();
  if (!providerUsername || providerUsernameCollidesWithPhone(providerUsername, user.phone)) {
    providerUsername = (await ensureProviderUsername(userId)) || providerUsername;
  }

  await ensureUserWallet(userId);
  await processUserVipProgress(userId);
  const [[wallet]] = await pool.query(
    `SELECT balance, required_turnover, completed_turnover, vip_level, vip_exp
     FROM user_wallets WHERE user_id = ? LIMIT 1`,
    [userId],
  );

  const [[affiliate]] = await pool.query(
    `SELECT referral_code FROM affiliate_profiles WHERE user_id = ? LIMIT 1`,
    [userId],
  );

  const vipProgress = await getVipProgress(wallet?.vip_level ?? 0, wallet?.vip_exp ?? 0);
  const turnoverBonusSummary = await getUserBonusWalletSummary(userId);
  const depositBonusSummary = await getUserDepositBonusStatus(userId);
  const combinedBonusBalance = Number(
    (turnoverBonusSummary.bonusBalance + depositBonusSummary.bonusBalance).toFixed(2),
  );
  const primaryProgress =
    depositBonusSummary.primaryProgress || turnoverBonusSummary.primaryProgress || null;
  const turnover = resolveEffectiveTurnover(wallet, depositBonusSummary.primaryProgress);

  return {
    id: user.id,
    name: user.name,
    username: user.name,
    providerUsername,
    phone: user.phone,
    email: user.email,
    balance: Number(user.balance),
    status: user.status,
    createdAt: user.created_at,
    referralCode: affiliate?.referral_code || null,
    withdrawChannel: await getUserWithdrawChannel(userId),
    wallet: {
      balance: Number(wallet?.balance ?? user.balance),
      requiredTurnover: turnover.requiredTurnover,
      completedTurnover: turnover.completedTurnover,
      remainingTurnover: turnover.remainingTurnover,
      turnoverComplete: turnover.turnoverComplete,
      vipLevel: Number(wallet?.vip_level ?? 0),
      vipExp: Number(wallet?.vip_exp ?? 0),
      vipLabel: vipProgress.vipLabel,
      currentVipExp: vipProgress.currentVipExp ?? 0,
      nextVipExp: vipProgress.nextVipExp,
      progressPercent: vipProgress.progressPercent ?? 0,
      safePercent: vipProgress.safePercent ?? 0,
      levelUpReward: vipProgress.levelUpReward ?? 0,
      monthlyReward: vipProgress.monthlyReward ?? 0,
      bonusBalance: combinedBonusBalance,
      depositBonusBalance: depositBonusSummary.bonusBalance,
      turnoverBonusBalance: turnoverBonusSummary.bonusBalance,
      bonusProgress: primaryProgress,
      bonusTurnoverComplete: true,
      depositBonusProgress: depositBonusSummary.primaryProgress,
    },
  };
}

export async function getUserProfile(req, res) {
  try {
    const profile = await fetchUserProfile(getUserId(req));
    if (!profile) return res.status(404).json({ error: 'User not found' });
    return res.json(profile);
  } catch (error) {
    console.error('Get user profile error:', error);
    return res.status(500).json({ error: 'Failed to load profile' });
  }
}

export async function getUserWallet(req, res) {
  try {
    const profile = await fetchUserProfile(getUserId(req));
    if (!profile) return res.status(404).json({ error: 'User not found' });
    return res.json({ wallet: profile.wallet, balance: profile.balance });
  } catch (error) {
    console.error('Get user wallet error:', error);
    return res.status(500).json({ error: 'Failed to load wallet' });
  }
}

export async function getUserTransactions(req, res) {
  const pool = getPool();
  const userId = getUserId(req);
  const type = String(req.query.type || 'all').trim();

  try {
    let sql = `SELECT id, type, amount, status, method, created_at, approved_at
               FROM transactions WHERE user_id = ?`;
    const params = [userId];

    if (type !== 'all') {
      sql += ` AND type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY created_at DESC LIMIT 100`;

    const [rows] = await pool.query(sql, params);

    return res.json({
      transactions: rows.map((row) => ({
        id: row.id,
        type: row.type,
        amount: Number(row.amount),
        status: row.status,
        method: row.method,
        createdAt: row.created_at,
        approvedAt: row.approved_at,
      })),
    });
  } catch (error) {
    console.error('Get user transactions error:', error);
    return res.status(500).json({ error: 'Failed to load transactions' });
  }
}

export async function getUserTurnover(req, res) {
  const pool = getPool();
  const userId = getUserId(req);

  try {
    await ensureUserWallet(userId);
    const [[wallet]] = await pool.query(
      `SELECT required_turnover, completed_turnover FROM user_wallets WHERE user_id = ?`,
      [userId],
    );

    const [[depositSum]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM transactions WHERE user_id = ? AND type = 'deposit' AND status = 'approved'`,
      [userId],
    );

    const [[bonusSum]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM bonus_records WHERE user_id = ? AND status = 'approved'`,
      [userId],
    );

    const required = Number(wallet.required_turnover);
    const completed = Number(wallet.completed_turnover);

    return res.json({
      deposit: Number(depositSum.total),
      bonus: Number(bonusSum.total),
      requiredTurnover: required,
      completedTurnover: completed,
      remainingTurnover: Math.max(0, required - completed),
      progressPercent: required > 0 ? Math.min(100, (completed / required) * 100) : 100,
      turnoverComplete: completed >= required,
    });
  } catch (error) {
    console.error('Get user turnover error:', error);
    return res.status(500).json({ error: 'Failed to load turnover' });
  }
}

export async function getUserBonus(req, res) {
  const pool = getPool();
  const userId = getUserId(req);

  try {
    const [[{ totalBonus }]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS totalBonus
       FROM bonus_records WHERE user_id = ? AND status = 'approved'`,
      [userId],
    );

    const [rows] = await pool.query(
      `SELECT id, title, amount, status, created_at
       FROM bonus_records WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [userId],
    );

    const turnoverClaims = await listUserBonusClaims(userId);
    const bonusProgress = await listUserBonusProgress(userId);
    const bonusSummary = await getUserBonusWalletSummary(userId);

    return res.json({
      totalBonus: Number(totalBonus),
      bonuses: rows.map((row) => ({
        id: row.id,
        title: row.title,
        amount: Number(row.amount),
        status: row.status,
        createdAt: row.created_at,
      })),
      turnoverClaims,
      bonusProgress,
      bonusSummary,
    });
  } catch (error) {
    console.error('Get user bonus error:', error);
    return res.status(500).json({ error: 'Failed to load bonus data' });
  }
}

export async function getBettingRecords(req, res) {
  const pool = getPool();
  const userId = getUserId(req);

  try {
    const [rows] = await pool.query(
      `SELECT id, game_name, bet_amount, win_amount, profit_loss, status, created_at
       FROM bet_records WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 100`,
      [userId],
    );

    return res.json({
      records: rows.map((row) => ({
        id: row.id,
        gameName: row.game_name,
        betAmount: Number(row.bet_amount),
        winAmount: Number(row.win_amount),
        profitLoss: Number(row.profit_loss),
        status: row.status,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Get betting records error:', error);
    return res.status(500).json({ error: 'Failed to load betting records' });
  }
}

export async function getUserMessages(req, res) {
  const pool = getPool();
  const userId = getUserId(req);

  try {
    const [rows] = await pool.query(
      `SELECT id, title, body, read_at, created_at
       FROM user_messages WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [userId],
    );

    return res.json({
      messages: rows.map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        readAt: row.read_at,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Get user messages error:', error);
    return res.status(500).json({ error: 'Failed to load messages' });
  }
}

export async function getReferralInfo(req, res) {
  const pool = getPool();
  const userId = getUserId(req);

  try {
    const [[affiliate]] = await pool.query(
      `SELECT referral_code FROM affiliate_profiles WHERE user_id = ? LIMIT 1`,
      [userId],
    );

    const code = affiliate?.referral_code || `JB${userId}`;
    const origin = req.headers.origin || 'https://jowabuzz.com';

    const [referrals] = await pool.query(
      `SELECT rr.id, rr.bonus_amount, rr.status, rr.created_at, u.name AS referredName
       FROM referral_records rr
       INNER JOIN users u ON u.id = rr.referred_user_id
       WHERE rr.referrer_user_id = ?
       ORDER BY rr.created_at DESC`,
      [userId],
    );

    return res.json({
      referralCode: code,
      referralLink: `${origin}/auth?tab=signup&ref=${code}`,
      referrals: referrals.map((row) => ({
        id: row.id,
        referredName: row.referredName,
        bonusAmount: Number(row.bonus_amount),
        status: row.status,
        createdAt: row.created_at,
      })),
      totalBonus: referrals.reduce(
        (sum, row) => sum + (row.status === 'approved' ? Number(row.bonus_amount) : 0),
        0,
      ),
    });
  } catch (error) {
    console.error('Get referral info error:', error);
    return res.status(500).json({ error: 'Failed to load referral info' });
  }
}

export async function getBankDetails(req, res) {
  const pool = getPool();
  const userId = getUserId(req);

  try {
    const [rows] = await pool.query(
      `SELECT method, account_name, account_number, bank_name, updated_at
       FROM user_bank_details WHERE user_id = ? LIMIT 1`,
      [userId],
    );

    return res.json({ bankDetails: rows[0] || null });
  } catch (error) {
    console.error('Get bank details error:', error);
    return res.status(500).json({ error: 'Failed to load bank details' });
  }
}

export async function createDepositRequest(req, res) {
  const pool = getPool();
  const userId = getUserId(req);
  if (!(await ensureActivePlayerAccount(userId, res))) return;
  const amount = Number(req.body.amount);
  const method = String(req.body.method || 'bkash').trim();
  const channel = String(req.body.channel || '').trim();
  const bonusRuleId = Number(req.body.bonusRuleId || req.body.bonus_rule_id || 0);

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid amount' });
  }

  try {
    await validateDepositAmount(amount);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [txResult] = await connection.query(
      `INSERT INTO transactions (user_id, type, amount, status, method)
       VALUES (?, 'deposit', ?, 'pending', ?)`,
      [userId, amount, method],
    );

    const [result] = await connection.query(
      `INSERT INTO deposit_requests (user_id, amount, method, channel, bonus_rule_id, status, transaction_id)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [userId, amount, method, channel, bonusRuleId > 0 ? bonusRuleId : null, txResult.insertId],
    );

    await connection.commit();

    let gateway = null;
    const gatewayConfig = await getActivePaymentGatewayConfig();
    try {
      gateway = await createDepositIntent({
        userId,
        amount,
        method,
        channel,
        transactionId: txResult.insertId,
      });
    } catch (gatewayError) {
      console.error('Payment gateway intent error:', gatewayError);
      if (gatewayConfig.provider === 'winypay') {
        return res.status(gatewayError.statusCode || 502).json({
          error: gatewayError.message || 'Payment gateway unavailable',
        });
      }
      gateway = {
        mode: 'manual',
        success: true,
        message: gatewayError.message || 'Gateway unavailable; manual review required',
      };
    }

    return res.status(201).json({
      success: true,
      message: 'Deposit request submitted',
      requestId: result.insertId,
      gateway,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Deposit request error:', error);
    return res.status(500).json({ error: 'Failed to submit deposit request' });
  } finally {
    connection.release();
  }
}

export async function createWithdrawRequest(req, res) {
  const pool = getPool();
  const userId = getUserId(req);
  if (!(await ensureActivePlayerAccount(userId, res))) return;
  if (!(await assertPlayerCanWithdraw(userId, res))) return;
  const amount = Number(req.body.amount);
  const method = String(req.body.method || 'bank').trim();
  const accountNumber = String(req.body.accountNumber || req.body.account_number || '').trim();

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid amount' });
  }

  if (!accountNumber) {
    return res.status(400).json({ error: 'Account number is required' });
  }

  try {
    await validateWithdrawAmount(amount);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message });
  }

  try {
    await assertWithdrawChannelForPayment(pool, userId);
  } catch (error) {
    return res.status(error.statusCode || 403).json({ error: error.message });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await ensureUserWallet(userId);

    const [[wallet]] = await connection.query(
      `SELECT required_turnover, completed_turnover FROM user_wallets WHERE user_id = ? FOR UPDATE`,
      [userId],
    );

    try {
      await enforceTurnoverForWithdraw(wallet, { userId });
      await enforceBonusTurnoverForWithdraw(userId, connection);
    } catch (error) {
      await connection.rollback();
      return res.status(error.statusCode || 400).json({ error: error.message });
    }

    const [[user]] = await connection.query(
      `SELECT balance FROM users WHERE id = ? FOR UPDATE`,
      [userId],
    );

    if (Number(user.balance) < amount) {
      await connection.rollback();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const [txResult] = await connection.query(
      `INSERT INTO transactions (user_id, type, amount, status, method)
       VALUES (?, 'withdraw', ?, 'pending', ?)`,
      [userId, amount, method],
    );

    await connection.query(
      `INSERT INTO withdraw_requests (user_id, amount, method, account_number, status, transaction_id)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
      [userId, amount, method, accountNumber, txResult.insertId],
    );

    await connection.commit();

    let gateway = null;
    try {
      gateway = await forwardWithdrawToPaymentGateway({
        userId,
        transactionId: txResult.insertId,
        amount,
        method,
        accountNumber,
      });
    } catch (gatewayError) {
      console.error('Withdraw gateway error:', gatewayError);
      return res.status(gatewayError.statusCode || 502).json({
        success: false,
        error: gatewayError.message || 'Withdrawal gateway request failed',
        transactionId: txResult.insertId,
      });
    }

    return res.status(201).json({
      success: true,
      message: gateway?.message || 'Withdraw request submitted',
      gateway,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Withdraw request error:', error);
    return res.status(500).json({ error: 'Failed to submit withdraw request' });
  } finally {
    connection.release();
  }
}

export async function changeUserPassword(req, res) {
  const pool = getPool();
  const userId = getUserId(req);
  const oldPassword = String(req.body.oldPassword || '');
  const newPassword = String(req.body.newPassword || '');
  const confirmPassword = String(req.body.confirmPassword || '');

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'All password fields are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    const [[user]] = await pool.query(
      `SELECT password_hash FROM users WHERE id = ? LIMIT 1`,
      [userId],
    );

    const valid = await comparePassword(oldPassword, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Old password is incorrect' });
    }

    const passwordHash = await hashPassword(newPassword);
    await pool.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, userId]);

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Failed to change password' });
  }
}

export async function createUpdateProfileRequest(req, res) {
  const pool = getPool();
  const userId = getUserId(req);
  const fieldName = String(req.body.fieldName || req.body.field || '').trim();
  const newValue = String(req.body.newValue || req.body.value || '').trim();

  const allowed = ['name', 'phone', 'email'];
  if (!allowed.includes(fieldName) || !newValue) {
    return res.status(400).json({ error: 'Invalid profile update request' });
  }

  try {
    const [[user]] = await pool.query(
      `SELECT name, phone, email FROM users WHERE id = ? LIMIT 1`,
      [userId],
    );

    const oldValue = user?.[fieldName] || '';

    await pool.query(
      `INSERT INTO user_update_requests (user_id, field_name, old_value, new_value, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [userId, fieldName, oldValue, newValue],
    );

    return res.status(201).json({
      success: true,
      message: 'Profile update request submitted for admin approval',
    });
  } catch (error) {
    console.error('Update profile request error:', error);
    return res.status(500).json({ error: 'Failed to submit update request' });
  }
}

export async function saveBankDetails(req, res) {
  const pool = getPool();
  const userId = getUserId(req);
  const method = String(req.body.method || 'bank').trim();
  const accountName = String(req.body.accountName || '').trim();
  const accountNumber = String(req.body.accountNumber || '').trim();
  const bankName = String(req.body.bankName || '').trim();

  if (!accountNumber) {
    return res.status(400).json({ error: 'Account number is required' });
  }

  try {
    await pool.query(
      `INSERT INTO user_bank_details (user_id, method, account_name, account_number, bank_name)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         method = VALUES(method),
         account_name = VALUES(account_name),
         account_number = VALUES(account_number),
         bank_name = VALUES(bank_name)`,
      [userId, method, accountName, accountNumber, bankName],
    );

    return res.json({ success: true, message: 'Bank details saved' });
  } catch (error) {
    console.error('Save bank details error:', error);
    return res.status(500).json({ error: 'Failed to save bank details' });
  }
}

export default getUserProfile;
