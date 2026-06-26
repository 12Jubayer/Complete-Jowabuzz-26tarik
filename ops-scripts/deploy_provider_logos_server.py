"""Upload user provider logos and fix ProviderStrip - server only."""
import paramiko
import os
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = '/www/wwwroot/jowabuzz'
PUBLIC_PROVIDERS = f'{ROOT}/frontend/public/images/providers'
DIST_PROVIDERS = f'{ROOT}/frontend/dist/images/providers'
PROVIDER_DATA = f'{ROOT}/frontend/src/data/publicGameProviders.js'
PROVIDER_STRIP = f'{ROOT}/frontend/src/components/ProviderStrip.jsx'

ASSETS = r'C:\Users\ASUS\.cursor\projects\c-Users-ASUS-Downloads-zip\assets'

LOGOS = [
    (
        'c__Users_ASUS_AppData_Roaming_Cursor_User_workspaceStorage_79bc73cfd74ea72ad2d5feb2cde2e0ff_images_provider-jdb-0c30655e-8184-4094-8a5b-4ca015fcf224.png',
        'jdb.png',
        'JDB',
    ),
    (
        'c__Users_ASUS_AppData_Roaming_Cursor_User_workspaceStorage_79bc73cfd74ea72ad2d5feb2cde2e0ff_images_icon-horsebook-8fdd44a5-3907-47cf-bdcb-ee68380d488d.png',
        'horsebook.png',
        'Horsebook',
    ),
    (
        'c__Users_ASUS_AppData_Roaming_Cursor_User_workspaceStorage_79bc73cfd74ea72ad2d5feb2cde2e0ff_images_provider-ka-70716724-4677-4be9-a70e-5d5269f72646.png',
        'ka.png',
        'KA Gaming',
    ),
    (
        'c__Users_ASUS_AppData_Roaming_Cursor_User_workspaceStorage_79bc73cfd74ea72ad2d5feb2cde2e0ff_images_provider-awcmsg-798a1266-243d-40e7-b980-944e8ebf3afe.png',
        'spadegaming.png',
        'Spadegaming',
    ),
    (
        'c__Users_ASUS_AppData_Roaming_Cursor_User_workspaceStorage_79bc73cfd74ea72ad2d5feb2cde2e0ff_images_provider-awcmfastspin-e8697fcb-9a9b-43b2-8ad1-3f741c3d20c7.png',
        'fastspin.png',
        'FastSpin',
    ),
    (
        'c__Users_ASUS_AppData_Roaming_Cursor_User_workspaceStorage_79bc73cfd74ea72ad2d5feb2cde2e0ff_images_provider-awcmp8-46f9e6b2-2f1b-4fd7-94cf-059a1c16a86c.png',
        'play8.png',
        'Play8',
    ),
    (
        'c__Users_ASUS_AppData_Roaming_Cursor_User_workspaceStorage_79bc73cfd74ea72ad2d5feb2cde2e0ff_images_provider-saba-9bd9badf-3ac7-4a9e-b605-c26fbdbcd99f.png',
        'saba.png',
        'SABA',
    ),
    (
        'c__Users_ASUS_AppData_Roaming_Cursor_User_workspaceStorage_79bc73cfd74ea72ad2d5feb2cde2e0ff_images_provider-jdbaspribe-e37b5787-e2fe-49ca-8541-9a1ad4b9369b.png',
        'spribe.png',
        'Spribe',
    ),
    (
        'c__Users_ASUS_AppData_Roaming_Cursor_User_workspaceStorage_79bc73cfd74ea72ad2d5feb2cde2e0ff_images_provider-awcmladyluck-5c50b775-e649-46cb-bfad-1cbe03d61f4f.png',
        'ladyluck.png',
        'Lady Luck',
    ),
    (
        'c__Users_ASUS_AppData_Roaming_Cursor_User_workspaceStorage_79bc73cfd74ea72ad2d5feb2cde2e0ff_images_provider-awcmrt-2be9477a-89ed-4418-b918-8b6534c1f817.png',
        'rt.png',
        'Red Tiger',
    ),
    (
        'c__Users_ASUS_AppData_Roaming_Cursor_User_workspaceStorage_79bc73cfd74ea72ad2d5feb2cde2e0ff_images_provider-nextspin-7571d548-be4f-4fca-96a4-5dbce6bd4724.png',
        'nextspin.png',
        'NextSpin',
    ),
    (
        'c__Users_ASUS_AppData_Roaming_Cursor_User_workspaceStorage_79bc73cfd74ea72ad2d5feb2cde2e0ff_images_provider-awcmsexy-5597a364-0229-4fb8-9162-0c24992cb6e7.png',
        'sexy.png',
        'Sexy',
    ),
    (
        'c__Users_ASUS_AppData_Roaming_Cursor_User_workspaceStorage_79bc73cfd74ea72ad2d5feb2cde2e0ff_images_provider-awcmyesbingo-dfd5aba0-6284-40b2-82de-fff0f3b973b5.png',
        'yesbingo.png',
        'Yes Bingo',
    ),
]

PUBLIC_PROVIDERS_JS = 'export const staticGameProviders = [\n'
for i, (_, filename, name) in enumerate(LOGOS, 1):
    PUBLIC_PROVIDERS_JS += (
        f"  {{ provider_name: '{name}', provider_logo: '/images/providers/{filename}', display_order: {i} }},\n"
    )
PUBLIC_PROVIDERS_JS += '];\n\nexport default staticGameProviders;\n'

PROVIDER_STRIP_JS = """import { useMemo } from 'react';
import { colors } from '../config/theme';
import { staticGameProviders } from '../data/publicGameProviders';
import SectionTitle from './SectionTitle';

function ProviderLogo({ src }) {
  return (
    <img
      src={src}
      alt=""
      role="presentation"
      className="game-providers-marquee__logo"
      loading="lazy"
      draggable={false}
    />
  );
}

export default function ProviderStrip() {
  const providers = staticGameProviders;

  const loopProviders = useMemo(
    () => [...providers, ...providers],
    [providers],
  );

  const animationSeconds = Math.max(providers.length * 3, 36);

  return (
    <section
      className="game-providers-section jb-mobile-section px-3 lg:px-4"
      style={{ backgroundColor: colors.sectionBg }}
      aria-label="Game Providers"
    >
      <SectionTitle title="Game Providers" />

      <div className="game-providers-marquee">
        <div
          className="game-providers-marquee__track"
          style={{ animationDuration: `${animationSeconds}s` }}
        >
          {loopProviders.map((provider, index) => (
            <div
              key={`${provider.provider_name}-${index}`}
              className="game-providers-marquee__item"
            >
              <ProviderLogo src={provider.provider_logo} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

# ensure dirs
for remote_dir in (PUBLIC_PROVIDERS, DIST_PROVIDERS):
    try:
        sftp.stat(remote_dir)
    except OSError:
        c.exec_command(f'mkdir -p {remote_dir}')

uploaded = 0
for local_name, remote_name, _ in LOGOS:
    local_path = os.path.join(ASSETS, local_name)
    if not os.path.isfile(local_path):
        print('MISSING', local_name)
        continue
    for remote_dir in (PUBLIC_PROVIDERS, DIST_PROVIDERS):
        remote_path = f'{remote_dir}/{remote_name}'
        sftp.put(local_path, remote_path)
    print('UPLOADED', remote_name)
    uploaded += 1

with sftp.open(PROVIDER_DATA, 'w') as f:
    f.write(PUBLIC_PROVIDERS_JS.encode('utf-8'))
print('WROTE publicGameProviders.js')

with sftp.open(PROVIDER_STRIP, 'w') as f:
    f.write(PROVIDER_STRIP_JS.encode('utf-8'))
print('WROTE ProviderStrip.jsx')

sftp.close()

print('Building frontend...')
_, o, e = c.exec_command(f'cd {ROOT}/frontend && npm run build 2>&1', timeout=300000)
combined = o.read().decode('utf-8', 'replace') + e.read().decode('utf-8', 'replace')
print('BUILD_OK' if ('built in' in combined.lower() or '✓' in combined) else combined[-2500:])

# copy logos to fresh dist after build
sftp = c.open_sftp()
for local_name, remote_name, _ in LOGOS:
    local_path = os.path.join(ASSETS, local_name)
    if os.path.isfile(local_path):
        sftp.put(local_path, f'{DIST_PROVIDERS}/{remote_name}')
sftp.close()

_, o, _ = c.exec_command(
    f'ls -la {DIST_PROVIDERS}/jdb.png {DIST_PROVIDERS}/spribe.png {DIST_PROVIDERS}/saba.png 2>&1'
)
print(o.read().decode())

c.close()
print(f'DONE uploaded={uploaded} logos')
