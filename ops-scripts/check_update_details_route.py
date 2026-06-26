import paramiko
c=paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101',22,'root','Jowabuzz@12',timeout=30)
_,o,_=c.exec_command("grep -rn 'update-details\\|updateAdminProvider\\|updateProviderDetails' /www/wwwroot/jowabuzz/backend", timeout=30)
print(o.read().decode())
_,o,_=c.exec_command("mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT id,code,name FROM providers WHERE code IN ('LUCKSPORT','LUCKYSPORTS'); SELECT g.id,g.name,p.code FROM games g JOIN providers p ON p.id=g.provider_id WHERE p.code IN ('LUCKSPORT','LUCKYSPORTS');\"", timeout=30)
print(o.read().decode())
c.close()
