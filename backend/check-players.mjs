import dotenv from 'dotenv';
dotenv.config({ path: '/www/wwwroot/jowabuzz/backend/.env' });
import { connectDatabase, getPool } from '/www/wwwroot/jowabuzz/backend/config/db.js';

await connectDatabase();
const pool = getPool();
const [rows] = await pool.query(
  `SELECT id, name, phone, provider_username
   FROM users WHERE role = 'user' AND status = 'active'
   ORDER BY id DESC LIMIT 8`,
);
console.log(JSON.stringify(rows, null, 2));
process.exit(0);
