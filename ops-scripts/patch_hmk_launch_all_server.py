"""
Patch hmkApiService.js on production server:
1. Remove provider-code fallback (causes 'Invalid game code')
2. Allow oracle catalog lookup for UID mapping when ORACLE_DISABLED
3. Prefer hex game code in candidates
"""
import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

REMOTE = '/www/wwwroot/jowabuzz/backend/services/hmkApiService.js'

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()
with sftp.open(REMOTE, 'r') as f:
    text = f.read().decode('utf-8').replace('\r\n', '\n')

changes = 0

old1 = """async function lookupCatalogGameUid({ providerCode, gameCode, gameName }) {
  if (isOracleDisabled()) {
    return null;
  }

  try {"""
new1 = """async function lookupCatalogGameUid({ providerCode, gameCode, gameName }) {
  try {"""
if old1 in text:
    text = text.replace(old1, new1, 1)
    changes += 1
    print('PATCH lookupCatalogGameUid: removed oracle disabled block')

old2 = """  add(gameCode);

  const catalogUid = await lookupCatalogGameUid({ providerCode, gameCode, gameName });
  add(catalogUid);

  add(providerCode);

  return candidates;"""
new2 = """  if (isOracleOnlyUid(gameCode)) {
    addSportsUid(gameCode);
  } else {
    add(gameCode);
  }

  const catalogUid = await lookupCatalogGameUid({ providerCode, gameCode, gameName });
  add(catalogUid);

  return candidates;"""
if old2 in text:
    text = text.replace(old2, new2, 1)
    changes += 1
    print('PATCH buildHmkLaunchUidCandidates: hex priority, no provider fallback')

if changes:
    with sftp.open(REMOTE, 'w') as f:
        f.write(text.encode('utf-8'))
    print('SAVED', changes, 'patches')
else:
    print('NO_PATCHES_APPLIED')
    idx = text.find('lookupCatalogGameUid')
    print(text[idx:idx+400])

sftp.close()
_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30000)
print(o.read().decode('utf-8','replace')[:120])
c.close()
