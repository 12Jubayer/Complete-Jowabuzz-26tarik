import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "curl -sI 'https://oraclegames.net/thumbnail/9W/' | head -5",
    "curl -sI 'https://oraclegames.net/thumbnail/9W.png' | head -5",
    "curl -sI 'https://oraclegames.net/thumbnail/9W.jpg' | head -5",
    "ls /www/wwwroot/jowabuzz/frontend/dist/images/providers/ | grep -i 9 || true",
    "ls /www/wwwroot/jowabuzz/backend/uploads/games/ | head -5",
]
for cmd in cmds:
    _, o, _ = c.exec_command(cmd, timeout=30000)
    print('>', cmd)
    print(o.read().decode('utf-8', 'replace'))
c.close()
