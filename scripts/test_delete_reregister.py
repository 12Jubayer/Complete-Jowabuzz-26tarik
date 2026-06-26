#!/usr/bin/env python3
"""Test permanentlyDeletePlayer on production."""
import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST, USER, PASS = '103.165.10.242', 'root', 'Jowabuzz@12'
USER_ID = 49

REMOTE_SCRIPT = f"""
set -e
cd /www/wwwroot/jowabuzz/backend
cat > test_hard_delete.mjs <<'EOF'
import 'dotenv/config';
import {{ connectDatabase, getPool }} from './config/db.js';
import {{ permanentlyDeletePlayer }} from './services/adminPlayerService.js';

const USER_ID = {USER_ID};
await connectDatabase();
const pool = getPool();
const conn = await pool.getConnection();
try {{
  const [[before]] = await conn.query('SELECT id,name,phone FROM users WHERE id=?', [USER_ID]);
  console.log('BEFORE:', JSON.stringify(before));
  await conn.beginTransaction();
  const result = await permanentlyDeletePlayer(conn, USER_ID);
  await conn.commit();
  console.log('RESULT:', JSON.stringify(result));
  const [[after]] = await conn.query('SELECT id,name FROM users WHERE id=?', [USER_ID]);
  console.log('AFTER:', JSON.stringify(after));
  const [jb] = await conn.query("SELECT id,name,phone FROM users WHERE name='jb'");
  console.log('JB_ROWS:', JSON.stringify(jb));
}} catch (e) {{
  await conn.rollback();
  console.error('ERROR:', e.message, e.code, e.sqlMessage);
  process.exit(1);
}} finally {{
  conn.release();
  await pool.end();
}}
EOF
node test_hard_delete.mjs
rm -f test_hard_delete.mjs
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=60, banner_timeout=120)
stdin, stdout, stderr = c.exec_command(REMOTE_SCRIPT, timeout=120)
print(stdout.read().decode('utf-8', errors='replace'))
err = stderr.read().decode('utf-8', errors='replace')
if err.strip():
    print('STDERR:', err)
c.close()
