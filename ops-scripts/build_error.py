import paramiko
c=paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101',22,'root','Jowabuzz@12',timeout=30)
_,o,e=c.exec_command('cd /www/wwwroot/jowabuzz/frontend && npm run build 2>&1', timeout=120000)
out=o.read().decode('utf-8','replace')
err=e.read().decode('utf-8','replace')
print(out[-3000:])
print(err[-1000:])
c.close()
