import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_, o, _ = c.exec_command(r'''curl -s -H "x-oraclegamedata-key: $(grep ORACLE_GAMING_DATA_KEY /www/wwwroot/jowabuzz/backend/.env | cut -d= -f2)" -H "x-orachal-key: $(grep ORACLE_GAMING_ORACHAL_KEY /www/wwwroot/jowabuzz/backend/.env | cut -d= -f2)" "https://oraclegames.net/api/game/PG" | python3 -c "import sys,json;d=json.load(sys.stdin); g=(d if isinstance(d,list) else d.get('games',d.get('data',[])))[:3]; print(json.dumps(g,indent=2)[:2500])"''', timeout=60000)
print(o.read().decode('utf-8','replace'))
c.close()
