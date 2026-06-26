import { getPool } from '../config/db.js';
import { syncWalletBalance } from '../services/userWalletService.js';
import { hashPassword } from '../utils/password.js';

const DEMO_PLAYER_NAME = 'jb';
const DEMO_PLAYER_PHONE = '01900000000';
const DEMO_PLAYER_PASSWORD = '123456';

async function seedWelcomeMessage(pool, userId) {
  const [existing] = await pool.query(
    `SELECT id FROM user_messages WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  if (existing.length) return;

  await pool.query(
    `INSERT INTO user_messages (user_id, title, body)
     VALUES (?, ?, ?)`,
    [
      userId,
      'Welcome to JowaBuzz',
      'Your account is ready. Deposit to start playing and check promotions for bonus offers.',
    ],
  );
}

export async function ensureDemoPlayer() {
  const pool = getPool();

  const [existing] = await pool.query(
    `SELECT id FROM users WHERE phone = ? LIMIT 1`,
    [DEMO_PLAYER_PHONE],
  );

  if (existing.length) {
    const userId = existing[0].id;
    await pool.query(
      `UPDATE users SET name = ?, balance = 63.00 WHERE phone = ?`,
      [DEMO_PLAYER_NAME, DEMO_PLAYER_PHONE],
    );
    await syncWalletBalance(userId);
    await seedWelcomeMessage(pool, userId);
    return;
  }

  const passwordHash = await hashPassword(DEMO_PLAYER_PASSWORD);

  const [result] = await pool.query(
    `INSERT INTO users (name, email, phone, password_hash, role, balance, status)
     VALUES (?, NULL, ?, ?, 'user', 63.00, 'active')`,
    [DEMO_PLAYER_NAME, DEMO_PLAYER_PHONE, passwordHash],
  );

  await syncWalletBalance(result.insertId);
  await seedWelcomeMessage(pool, result.insertId);

  console.log(`Demo player seeded (${DEMO_PLAYER_NAME} / ${DEMO_PLAYER_PHONE})`);
}

export default ensureDemoPlayer;
