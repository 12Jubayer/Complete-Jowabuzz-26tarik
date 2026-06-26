#!/usr/bin/env python3
import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.165.10.242', 22, 'root', 'Jowabuzz@12', timeout=30)

_, stdout, _ = c.exec_command(
    """mysql -uroot -p656940d50e847e3f jowabuzz -N -e "
SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_NAME = 'users' AND TABLE_SCHEMA = 'jowabuzz'
ORDER BY TABLE_NAME;" 2>/dev/null"""
)
print(stdout.read().decode())

# Check if delete service exists on prod
_, stdout, _ = c.exec_command(
    'grep -c permanentlyDeletePlayer /www/wwwroot/jowabuzz/backend/services/adminPlayerService.js 2>/dev/null'
)
print('permanentlyDeletePlayer in prod:', stdout.read().decode().strip())

c.close()
