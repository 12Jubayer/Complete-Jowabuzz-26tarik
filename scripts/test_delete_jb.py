#!/usr/bin/env python3
"""Test delete player id 52 (jb) on production."""
import paramiko

NODE = r"""
import { getPool } from '../config/db.js';
import { permanentlyDeletePlayer } from '../services/adminPlayerService.js';

const pool = getPool();
const conn = await pool.getConnection();
try {
  await conn.beginTransaction();
  const result = await permanentlyDeletePlayer(conn, 52);
  await conn.commit();
  console.log(JSON.stringify({ ok: true, result }, null, 2));
} catch (e) {
  await conn.rollback();
  console.log(JSON.stringify({
    ok: false,
    message: e.message,
    code: e.code,
    sqlMessage: e.sqlMessage,
    errno: e.errno,
  }, null, 2));
} finally {
  conn.release();
  await pool.end();
}
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()
with sftp.file('/www/wwwroot/jowabuzz/backend/scripts/test_delete_jb.mjs', 'w') as f:
    f.write(NODE)
sftp.close()

_, stdout, stderr = c.exec_command(
    'cd /www/wwwroot/jowabuzz/backend && node scripts/test_delete_jb.mjs 2>&1'
)
print(stdout.read().decode())
print(stderr.read().decode())

_, stdout, _ = c.exec_command(
    "mysql -uroot -p656940d50e847e3f jowabuzz -N -e \"SELECT COUNT(*) FROM users WHERE id=52 OR name='jb'\" 2>/dev/null"
)
print('remaining jb rows:', stdout.read().decode().strip())
c.close()
