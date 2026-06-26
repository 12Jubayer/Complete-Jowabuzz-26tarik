"""Fix HomePage refresh restoring sports from history.state - server only."""
import paramiko
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = '/www/wwwroot/jowabuzz'
FILE = f'{ROOT}/frontend/src/pages/HomePage.jsx'

OLD_EFFECT = """  useEffect(() => {
    if (location.state?.category || location.state?.provider) {
      const category = location.state.category ?? null;
      if (category) {
        setActiveNavCategory(category);
      }
      setSelectedCategory(category);
      setSelectedProvider(location.state.provider ?? null);
      setSelectedGameTitle(null);
    }
  }, [location.state]);"""

NEW_EFFECT = """  useEffect(() => {
    const navEntry = performance.getEntriesByType('navigation')[0];
    const navType = navEntry?.type || '';
    const isReload = navType === 'reload';

    if (isReload) {
      setActiveNavCategory(null);
      setSelectedCategory(null);
      setSelectedProvider(null);
      setSelectedGameTitle(null);
      if (location.state && Object.keys(location.state).length > 0) {
        navigate(location.pathname, { replace: true, state: null });
      }
      return;
    }

    if (!location.state?.category && !location.state?.provider) {
      return;
    }

    const category = location.state.category ?? null;
    if (category) {
      setActiveNavCategory(category);
    }
    setSelectedCategory(category);
    setSelectedProvider(location.state.provider ?? null);
    setSelectedGameTitle(null);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

with sftp.open(FILE, 'r') as f:
    content = f.read().decode('utf-8').replace('\r\n', '\n')

if OLD_EFFECT not in content:
    if 'navType === \'reload\'' in content:
        print('ALREADY_PATCHED')
    else:
        print('PATTERN_NOT_FOUND')
        idx = content.find('location.state?.category')
        print(content[max(0, idx - 100):idx + 400])
        sftp.close()
        c.close()
        sys.exit(1)
else:
    content = content.replace(OLD_EFFECT, NEW_EFFECT, 1)
    with sftp.open(FILE, 'w') as f:
        f.write(content.encode('utf-8'))
    print('PATCHED HomePage.jsx')

sftp.close()

_, o, e = c.exec_command(f'cd {ROOT}/frontend && npm run build 2>&1', timeout=300000)
combined = o.read().decode('utf-8', 'replace') + e.read().decode('utf-8', 'replace')
print('BUILD_OK' if ('built in' in combined.lower() or '✓' in combined) else combined[-3000:])

_, o, _ = c.exec_command(f"grep -n \"navType === 'reload'\" {FILE}")
print('verify:', o.read().decode().strip())

c.close()
print('DONE')
