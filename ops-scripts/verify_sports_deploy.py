import paramiko, time
c=paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101',22,'root','Jowabuzz@12',timeout=30)
_,o,_=c.exec_command("mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT p.code,p.name,p.provider_logo,g.image_url FROM providers p LEFT JOIN games g ON g.provider_id=p.id AND g.category='sports' WHERE p.code IN ('LUCKYSPORTS','SABA','9W','WS') LIMIT 10;\"", timeout=30)
print(o.read().decode())
_,o,_=c.exec_command('cd /www/wwwroot/jowabuzz/frontend && npm run build 2>&1 | tail -8', timeout=300000)
print(o.read().decode())
c.close()
