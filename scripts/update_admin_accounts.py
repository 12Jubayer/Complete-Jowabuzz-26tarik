#!/usr/bin/env python3
"""Update super admin email and permanently delete duplicate admin account."""
import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST, USER, PASS = '103.165.10.242', 'root', 'Jowabuzz@12'
DB_PASS = '656940d50e847e3f'
DB = 'jowabuzz'

OLD_EMAIL = 'jowabuzzofficial@mail.com'
NEW_EMAIL = 'jowabuzzofficial@gmail.com'
DELETE_EMAIL = 'admin@jowabuzz.com'

REMOTE_SQL = f"""
START TRANSACTION;

SELECT id, name, email, role, status FROM admins ORDER BY id;

SET @keep_id := (SELECT id FROM admins WHERE email = '{OLD_EMAIL}' LIMIT 1);
SET @delete_id := (SELECT id FROM admins WHERE email = '{DELETE_EMAIL}' LIMIT 1);

SELECT @keep_id AS keep_admin_id, @delete_id AS delete_admin_id;

SELECT IF(@keep_id IS NULL, 'ERROR: keep admin not found', 'OK keep admin') AS keep_check;
SELECT IF(@delete_id IS NULL, 'ERROR: delete admin not found', 'OK delete admin') AS delete_check;
SELECT IF((SELECT COUNT(*) FROM admins WHERE email = '{NEW_EMAIL}') > 0,
          'ERROR: new email already exists', 'OK new email free') AS email_check;

UPDATE admin_audit_logs SET admin_id = NULL WHERE admin_id = @delete_id;

UPDATE admins
SET email = '{NEW_EMAIL}'
WHERE id = @keep_id AND email = '{OLD_EMAIL}';

DELETE FROM admins
WHERE id = @delete_id AND email = '{DELETE_EMAIL}';

SELECT id, name, email, role, status FROM admins ORDER BY id;

COMMIT;
"""


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, 22, USER, PASS, timeout=30)

    print('=== BEFORE ===')
    _, stdout, _ = c.exec_command(
        f"mysql -uroot -p{DB_PASS} {DB} -t -e \"SELECT id,name,email,role,status FROM admins ORDER BY id\" 2>/dev/null"
    )
    print(stdout.read().decode('utf-8', errors='replace'))

    sql_file = '/tmp/jb_admin_update.sql'
    sftp = c.open_sftp()
    with sftp.file(sql_file, 'w') as f:
        f.write(REMOTE_SQL)
    sftp.close()

    print('=== RUNNING UPDATE ===')
    _, stdout, stderr = c.exec_command(
        f"mysql -uroot -p{DB_PASS} {DB} -t < {sql_file} 2>&1"
    )
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print(out)
    if err.strip():
        print(err, file=sys.stderr)

    if 'ERROR:' in out:
        print('FAILED: validation error detected')
        c.exec_command(f'rm -f {sql_file}')
        c.close()
        sys.exit(1)

    print('=== AFTER ===')
    _, stdout, _ = c.exec_command(
        f"mysql -uroot -p{DB_PASS} {DB} -t -e \"SELECT id,name,email,role,status FROM admins ORDER BY id\" 2>/dev/null"
    )
    after = stdout.read().decode('utf-8', errors='replace')
    print(after)

    _, stdout, _ = c.exec_command(
        f"mysql -uroot -p{DB_PASS} {DB} -N -e \"SELECT COUNT(*) FROM admins WHERE email='{DELETE_EMAIL}'\" 2>/dev/null"
    )
    deleted_count = stdout.read().decode().strip()
    print(f'Deleted email count: {deleted_count}')

    c.exec_command(f'rm -f {sql_file}')
    c.close()

    if NEW_EMAIL not in after or DELETE_EMAIL in after:
        print('VERIFICATION FAILED')
        sys.exit(1)

    print('VERIFICATION OK')
    print(f'✔ Super Admin email = {NEW_EMAIL}')
    print(f'✔ {DELETE_EMAIL} permanently deleted')


if __name__ == '__main__':
    main()
