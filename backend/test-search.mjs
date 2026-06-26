import dotenv from 'dotenv';
dotenv.config({ path: '/www/wwwroot/jowabuzz/backend/.env' });
import { connectDatabase, getPool } from '/www/wwwroot/jowabuzz/backend/config/db.js';

await connectDatabase();
const pool = getPool();
for (const id of ['913622290', '179726593', '999999999']) {
  const [rows] = await pool.query(
    `SELECT id, name, provider_username FROM users
     WHERE role = 'user' AND status = 'active' AND provider_username = ? LIMIT 1`,
    [id],
  );
  console.log(id, rows[0] || 'NOT FOUND');
}
process.exit(0);
