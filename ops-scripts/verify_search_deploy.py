import paramiko
c=paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101',22,'root','Jowabuzz@12',timeout=30)
_,o,_=c.exec_command("grep -n 'fetchSiteSearch\\|isSearchActive\\|handleSearchGameClick' /www/wwwroot/jowabuzz/frontend/src/components/MobileMenuDrawer.jsx | head -15", timeout=20)
print(o.read().decode())
_,o,_=c.exec_command("pm2 logs jowabuzz --lines 20 --nostream 2>&1 | tail -15", timeout=20)
print(o.read().decode())
c.close()
