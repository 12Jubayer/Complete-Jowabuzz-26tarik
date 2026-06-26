import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)

cmds = [
    "grep -E 'HMK_|SOFTAPI_|RETURN' /www/wwwroot/jowabuzz/backend/.env | sed 's/=.*/=***/'",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT COUNT(*) c FROM game_sessions WHERE status='active'; SELECT user_id, COUNT(*) c FROM game_sessions WHERE status='active' GROUP BY user_id ORDER BY c DESC LIMIT 10;\"",
    "mysql -uroot -p656940d50e847e3f jowabuzz -e \"SELECT gs.id, gs.user_id, gs.status, gs.created_at, g.name, p.code FROM game_sessions gs JOIN games g ON g.id=gs.game_id JOIN providers p ON p.id=gs.provider_id WHERE p.code='SPRIBE' ORDER BY gs.id DESC LIMIT 15;\"",
]

for cmd in cmds:
    print('===', cmd[:90], '===')
    _, o, e = c.exec_command(cmd, timeout=60)
    print(o.read().decode('utf-8', 'replace'))
    err = e.read().decode('utf-8', 'replace')
    if err and 'Warning' not in err:
        print('ERR', err[:400])

c.close()
