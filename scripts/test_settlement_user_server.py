#!/usr/bin/env python3
"""Test settlement User ID validation uses provider_username on server."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

TEST = r"""
set -e
cd /www/wwwroot/jowabuzz/backend

node --input-type=module << 'EOF'
import dotenv from 'dotenv';
dotenv.config({ path: '/www/wwwroot/jowabuzz/backend/.env' });
import { connectDatabase, getPool } from './config/db.js';
import { validateActivePlayerUserId } from './services/affiliateSettlementUserService.js';

await connectDatabase();
const pool = getPool();

const publicId = '878100975';
const valid = await validateActivePlayerUserId(publicId);
console.log('TEST_public_id:', valid.valid ? 'PASS' : 'FAIL', valid);

const invalidInternal = await validateActivePlayerUserId('31');
console.log('TEST_internal_id_rejected:', !invalidInternal.valid ? 'PASS' : 'FAIL');

const [[row]] = await pool.query(
  `SELECT id, provider_username, status FROM users WHERE provider_username=? LIMIT 1`,
  [publicId]
);
console.log('DB_ROW:', row);
EOF

curl -s -X POST http://127.0.0.1:3001/api/affiliate/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"TestSettle878","phone":"01999999088","email":"testsettle878@test.com","password":"test123","settlementUserId":"878100975"}'
echo
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=60, banner_timeout=60)
_, o, e = c.exec_command(TEST, timeout=120)
print(o.read().decode('utf-8', errors='replace'))
err = e.read().decode('utf-8', errors='replace')
if err.strip():
    print(err, file=sys.stderr)
c.close()
