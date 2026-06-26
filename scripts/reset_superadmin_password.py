#!/usr/bin/env python3
import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST, USER, PASS = '103.165.10.242', 'root', 'Jowabuzz@12'

NODE_RESET = r"""
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '656940d50e847e3f',
  database: 'jowabuzz',
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
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=30)
sftp = c.open_sftp()
with sftp.file('/www/wwwroot/jowabuzz/backend/scripts/reset_superadmin.mjs', 'w') as f:
    f.write(NODE_RESET)
sftp.close()

_, stdout, stderr = c.exec_command(
    'cd /www/wwwroot/jowabuzz/backend && node scripts/reset_superadmin.mjs 2>&1'
)
print(stdout.read().decode())
print(stderr.read().decode())
c.close()
