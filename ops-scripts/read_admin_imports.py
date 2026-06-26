import paramiko
c=paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101',22,'root','Jowabuzz@12',timeout=30)
_,o,_=c.exec_command("sed -n '1,25p' /www/wwwroot/jowabuzz/frontend/src/pages/admin/AdminGamesPage.jsx", timeout=20)
print(o.read().decode())
c.close()
