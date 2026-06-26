import paramiko
from pathlib import Path

HOST = '103.168.173.101'
USER = 'root'
PASSWORD = 'Jowabuzz@12'
REMOTE = '/www/wwwroot/jowabuzz'
local = Path(r'c:\Users\ASUS\Downloads\zip\JB-main(1)\JB-main\backend\services\paymentGatewayConfig.js')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASSWORD, timeout=30)
sftp = c.open_sftp()
sftp.put(str(local), f'{REMOTE}/backend/services/paymentGatewayConfig.js')
print('uploaded paymentGatewayConfig.js')
sftp.close()
c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
c.close()
