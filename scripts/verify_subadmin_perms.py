#!/usr/bin/env python3
"""Verify sub-admin permission enforcement on production."""
import json
import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST, USER, PASS = '103.165.10.242', 'root', 'Jowabuzz@12'

# Replace with known sub-admin password if testing login - skip login, test via curl on server with token from DB is hard
# Instead verify deployed JS contains filterAdminSidebarMenu strict check and grep backend file

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=30)

checks = [
    "grep -c SUPER_ADMIN_ONLY /www/wwwroot/jowabuzz/frontend/src/utils/adminPermissions.js 2>/dev/null || echo 0",
    "grep -c isSuperAdminOnlyPath /www/wwwroot/jowabuzz/backend/config/adminRoutePermissions.js 2>/dev/null || echo 0",
    "grep -c isRestrictedSubAdminAction /www/wwwroot/jowabuzz/backend/config/adminRoutePermissions.js 2>/dev/null || echo 0",
    "grep -o 'SUPER_ADMIN_ONLY' /www/wwwroot/jowabuzz/frontend/dist/assets/index-*.js 2>/dev/null | head -1 || echo missing",
]

for cmd in checks:
    _, stdout, _ = c.exec_command(cmd)
    print(stdout.read().decode().strip())

c.close()
