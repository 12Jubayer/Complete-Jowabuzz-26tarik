const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateReferralCode(prefix = 'JB') {
  let code = prefix.toUpperCase().slice(0, 3);
  while (code.length < 7) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code.slice(0, 8);
}

export async function generateUniqueReferralCode(pool, prefix = 'JB') {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateReferralCode(prefix);
    const [rows] = await pool.query(
      `SELECT id FROM affiliate_profiles WHERE referral_code = ? LIMIT 1`,
      [code],
    );
    if (!rows.length) return code;
  }

  return `${prefix}${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

export default generateUniqueReferralCode;
