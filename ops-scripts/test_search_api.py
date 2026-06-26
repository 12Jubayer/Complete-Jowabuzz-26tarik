import paramiko, time
c=paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101',22,'root','Jowabuzz@12',timeout=30)
time.sleep(2)
for q in ['aviator','jili','pg']:
    _,o,_=c.exec_command(f"curl -s 'http://127.0.0.1:3001/api/site/search?q={q}&limit=3'", timeout=30)
    print(q, o.read().decode('utf-8','replace')[:500])
    print('---')
c.close()
