import { getPool } from '../config/db.js';

const DEMO_AFFILIATE_PHONE = '01900000000';

export async function ensureDemoAffiliateApproved() {
  const pool = getPool();

  await pool.query(
    `UPDATE affiliate_profiles ap
     INNER JOIN users u ON u.id = ap.user_id
     SET ap.status = 'approved', ap.commission_percent = 25
     WHERE u.phone = ?`,
    [DEMO_AFFILIATE_PHONE],
  );
}

export default ensureDemoAffiliateApproved;
