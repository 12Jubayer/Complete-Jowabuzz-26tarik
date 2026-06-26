import paramiko
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
files = [
    ('/www/wwwroot/jowabuzz/frontend/src/pages/profile/ProfileDepositPage.jsx', 220, 80),
    ('/www/wwwroot/jowabuzz/backend/services/winypayService.js', 1, 120),
    ('/www/wwwroot/jowabuzz/backend/controllers/userProfileController.js', 1, 50),
]
for path, start, lines in files:
    _,o,_=c.exec_command(f"sed -n '{start},{start+lines-1}p' {path}")
    out=o.read().decode('utf-8', errors='replace')
    print(f'===== {path} L{start}-{start+lines-1} =====')
    print(out.encode('ascii', errors='replace').decode())
# find createDepositRequest
_,o,_=c.exec_command("grep -n 'createDepositRequest\\|createDepositIntent\\|gateway' /www/wwwroot/jowabuzz/backend/controllers/userProfileController.js | head -30")
print('===== grep controller =====')
print(o.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode())
_,o,_=c.exec_command("sed -n '$(grep -n \"export async function createDepositRequest\" /www/wwwroot/jowabuzz/backend/controllers/userProfileController.js | cut -d: -f1),$(($(grep -n \"export async function createDepositRequest\" /www/wwwroot/jowabuzz/backend/controllers/userProfileController.js | cut -d: -f1)+80))p' /www/wwwroot/jowabuzz/backend/controllers/userProfileController.js")
print('===== createDepositRequest =====')
print(o.read().decode('utf-8', errors='replace').encode('ascii', errors='replace').decode())
c.close()
