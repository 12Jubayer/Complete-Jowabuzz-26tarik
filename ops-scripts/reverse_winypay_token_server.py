import paramiko, hashlib, hmac
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
_,o,_=c.exec_command("grep WINYPAY_SECRET_KEY /www/wwwroot/jowabuzz/backend/.env")
secret = o.read().decode().split('=',1)[1].strip()
order='DEP-1782231433442-31'
internal='DEP202606232216441873'
expected='2af3c878ebfa6afce2d900bfa5a74707cdd33b02c770095e7fa3b26b9b60095a'
merchant='M10AAF98'
parts = [order, internal, merchant, f'{order}{internal}', f'{internal}{order}', f'{merchant}{order}', f'{merchant}{internal}']
for p in parts:
    for fn in ('sha256','md5'):
        h = getattr(hashlib, fn)(p.encode()).hexdigest()
        if h == expected:
            print('MATCH', fn, p)
        h2 = hmac.new(secret.encode(), p.encode(), hashlib.sha256).hexdigest()
        if h2 == expected:
            print('HMAC MATCH', p)
# also test on server with openssl
script = f'''
secret="{secret}"
order="{order}"
internal="{internal}"
expected="{expected}"
for s in "$order" "$internal" "$order$internal" "$internal$order"; do
  h=$(printf "%s" "$s" | openssl dgst -sha256 -hmac "$secret" | awk '{{print $2}}')
  if [ "$h" = "$expected" ]; then echo HMAC_OK $s; fi
  h2=$(printf "%s" "$s" | openssl dgst -sha256 | awk '{{print $2}}')
  if [ "$h2" = "$expected" ]; then echo SHA_OK $s; fi
done
'''
_,o,_=c.exec_command(f'bash -lc {repr(script)}')
print(o.read().decode())
c.close()
