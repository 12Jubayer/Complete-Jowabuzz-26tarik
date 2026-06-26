#!/usr/bin/env python3
"""Permanently delete all affiliate applicants except Md helalujjaman (id=20) on production."""
import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

KEEP_AFFILIATE_ID = 20
HOST, USER, PASS = '103.165.10.242', 'root', 'Jowabuzz@12'

REMOTE_SCRIPT = f"""
set -e
cd /www/wwwroot/jowabuzz/backend
cat > cleanup_affiliates.mjs <<'EOF'
import 'dotenv/config';
import {{ connectDatabase, getPool }} from './config/db.js';
import {{ cleanupAffiliateApplicantsExcept }} from './services/affiliateCleanupService.js';

const KEEP_AFFILIATE_ID = {KEEP_AFFILIATE_ID};
await connectDatabase();
const pool = getPool();
const conn = await pool.getConnection();

try {{
  await conn.beginTransaction();
  const deleted = await cleanupAffiliateApplicantsExcept(conn, KEEP_AFFILIATE_ID);
  await conn.commit();
  console.log('DELETED_COUNT:', deleted.length);
  console.log(JSON.stringify(deleted, null, 2));

  const [remaining] = await conn.query(
    `SELECT ap.id, u.name, u.phone, u.email, ap.status
     FROM affiliate_profiles ap
     JOIN users u ON u.id = ap.user_id
     WHERE ap.registered_as_affiliate = 1
     ORDER BY ap.id`
  );
  console.log('REMAINING:', JSON.stringify(remaining, null, 2));
}} catch (e) {{
  await conn.rollback();
  console.error('ERROR:', e.message, e.code, e.sqlMessage);
  process.exit(1);
}} finally {{
  conn.release();
  await pool.end();
}}
EOF
node cleanup_affiliates.mjs
rm -f cleanup_affiliates.mjs
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=60, banner_timeout=120)
stdin, stdout, stderr = c.exec_command(REMOTE_SCRIPT, timeout=180)
print(stdout.read().decode('utf-8', errors='replace'))
err = stderr.read().decode('utf-8', errors='replace')
if err.strip():
    print('STDERR:', err)
c.close()
