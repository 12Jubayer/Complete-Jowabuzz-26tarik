import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = r'c:\Users\ASUS\Downloads\zip\JB-main(1)\JB-main'
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()
sftp.put(f'{ROOT}/backend/scripts/probe_9w_oracle_launch.js', '/www/wwwroot/jowabuzz/backend/scripts/probe_9w_oracle_launch.js')
sftp.close()
_, o, e = c.exec_command('cd /www/wwwroot/jowabuzz/backend && node scripts/probe_9w_oracle_launch.js 2>&1', timeout=120000)
print(o.read().decode('utf-8', 'replace'))
err = e.read().decode('utf-8', 'replace')
if err.strip():
    print('ERR', err[:600])
c.close()
