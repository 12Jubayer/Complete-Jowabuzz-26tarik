import paramiko, time
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
c.exec_command('pm2 restart jowabuzz --update-env', timeout=30)
time.sleep(5)
for cmd in [
    'curl -s http://127.0.0.1:3001/api/health',
    'curl -s http://127.0.0.1:3001/api/hmk/health',
    'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/oracle/debug-session',
]:
    _, o, _ = c.exec_command(cmd, timeout=20)
    print(cmd, '=>', o.read().decode('utf-8', errors='replace').strip())
c.close()
