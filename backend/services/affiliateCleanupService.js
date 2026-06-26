import { getPool } from '../config/db.js';

async function safeQuery(connection, sql, params = []) {
  try {
    const [result] = await connection.query(sql, params);
    return result;
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return { affectedRows: 0 };
    }
    throw error;
  }
}

export async function fetchAffiliateApplicantOrThrow(connection, affiliateId) {
  const [[row]] = await connection.query(
    `SELECT ap.id, ap.user_id, ap.referral_code, ap.registered_as_affiliate, u.name, u.phone, u.email
     FROM affiliate_profiles ap
     INNER JOIN users u ON u.id = ap.user_id
     WHERE ap.id = ? AND ap.registered_as_affiliate = 1
     LIMIT 1`,
    [affiliateId],
  );

  if (!row) {
    const error = new Error('Affiliate applicant not found');
    error.statusCode = 404;
    throw error;
  }

  return row;
}

async function deleteAffiliateChildRecords(connection, affiliateId) {
  await safeQuery(connection, `DELETE FROM affiliate_transactions WHERE affiliate_id = ?`, [affiliateId]);
  await safeQuery(
    connection,
    `DELETE FROM affiliate_settlement_user_history WHERE affiliate_id = ?`,
    [affiliateId],
  );
  await safeQuery(
    connection,
    `DELETE FROM affiliate_linked_user_history WHERE affiliate_id = ?`,
    [affiliateId],
  );
  await safeQuery(connection, `DELETE FROM settlement_history WHERE affiliate_id = ?`, [affiliateId]);
  await safeQuery(connection, `DELETE FROM affiliate_settlements WHERE affiliate_id = ?`, [affiliateId]);
  await safeQuery(
    connection,
    `DELETE FROM affiliate_withdraw_requests WHERE affiliate_id = ?`,
    [affiliateId],
  );
  await safeQuery(
    connection,
    `DELETE FROM commission_records
     WHERE beneficiary_id = ? AND role_type IN ('affiliate', 'super_affiliate')`,
    [affiliateId],
  );
  await safeQuery(
    connection,
    `UPDATE affiliate_profiles SET referred_by = NULL WHERE referred_by = ?`,
    [affiliateId],
  );
}

async function deleteAffiliateUserAccount(connection, userId) {
  await safeQuery(connection, `DELETE FROM user_otps WHERE user_id = ?`, [userId]);
  await safeQuery(connection, `DELETE FROM user_wallets WHERE user_id = ?`, [userId]);
  await safeQuery(connection, `DELETE FROM wallets WHERE user_id = ?`, [userId]);
  await safeQuery(connection, `DELETE FROM user_notifications WHERE user_id = ?`, [userId]);
  await safeQuery(connection, `DELETE FROM user_bank_details WHERE user_id = ?`, [userId]);

  const [result] = await connection.query(`DELETE FROM users WHERE id = ?`, [userId]);
  return Number(result.affectedRows || 0);
}

export async function permanentlyDeleteAffiliateApplicant(connection, affiliateId) {
  const affiliate = await fetchAffiliateApplicantOrThrow(connection, affiliateId);

  console.info('[affiliateDelete] removing applicant', {
    affiliateId: affiliate.id,
    userId: affiliate.user_id,
    name: affiliate.name,
    phone: affiliate.phone,
    email: affiliate.email,
  });

  await deleteAffiliateChildRecords(connection, affiliate.id);

  const [profileResult] = await connection.query(`DELETE FROM affiliate_profiles WHERE id = ?`, [
    affiliate.id,
  ]);

  if (!profileResult.affectedRows) {
    const error = new Error('Failed to delete affiliate profile');
    error.statusCode = 500;
    throw error;
  }

  const deletedUsers = await deleteAffiliateUserAccount(connection, affiliate.user_id);

  if (!deletedUsers) {
    const error = new Error('Failed to delete affiliate user account');
    error.statusCode = 500;
    throw error;
  }

  return {
    deleted: true,
    affiliateId: affiliate.id,
    userId: affiliate.user_id,
    name: affiliate.name,
    deletedProfileRows: profileResult.affectedRows,
    deletedUserRows: deletedUsers,
  };
}

export async function cleanupAffiliateApplicantsExcept(connection, keepAffiliateId) {
  const keepId = Number(keepAffiliateId);
  if (!keepId) {
    throw new Error('keepAffiliateId is required');
  }

  const [rows] = await connection.query(
    `SELECT id FROM affiliate_profiles WHERE registered_as_affiliate = 1 AND id <> ? ORDER BY id`,
    [keepId],
  );

  const results = [];
  for (const row of rows) {
    results.push(await permanentlyDeleteAffiliateApplicant(connection, row.id));
  }

  return results;
}

export default {
  permanentlyDeleteAffiliateApplicant,
  cleanupAffiliateApplicantsExcept,
};
