import paramiko
c=paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101',22,'root','Jowabuzz@12',timeout=30)
_,o,_=c.exec_command("grep -c 'return succeedLaunch' /www/wwwroot/jowabuzz/backend/controllers/gameController.js", timeout=20)
print('succeedLaunch count', o.read().decode())
c.close()
