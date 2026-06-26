
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jowabuzz',
});

const hash = await bcrypt.hash('112233', 12);
const [result] = await pool.query(
  `UPDATE admins SET password_hash = ?, email = LOWER(TRIM(email)), status = 'active' WHERE id = 2 AND role = 'super_admin'`,
  [hash],
);

const [[admin]] = await pool.query(`SELECT id, email, role, status FROM admins WHERE id = 2`);
const [[oldMail]] = await pool.query(`SELECT COUNT(*) AS c FROM admins WHERE LOWER(email) = 'jowabuzzofficial@mail.com'`);
const [[deletedAdmin]] = await pool.query(`SELECT COUNT(*) AS c FROM admins WHERE email = 'admin@jowabuzz.com'`);

console.log(JSON.stringify({ updatedRows: result.affectedRows, admin, oldMailExists: oldMail.c, deletedAdminExists: deletedAdmin.c }, null, 2));
await pool.end();
