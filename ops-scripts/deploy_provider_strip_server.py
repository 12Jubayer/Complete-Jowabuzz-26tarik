"""Deploy beautiful logo-only provider marquee - server only."""
import paramiko
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = '/www/wwwroot/jowabuzz'
PROVIDER_DATA = f'{ROOT}/frontend/src/data/publicGameProviders.js'
PROVIDER_STRIP = f'{ROOT}/frontend/src/components/ProviderStrip.jsx'
PROVIDER_LOGO = f'{ROOT}/frontend/src/utils/providerLogo.js'
ROUTES = f'{ROOT}/backend/routes/publicSiteGamesRoutes.js'
SITE_SVC = f'{ROOT}/frontend/src/services/siteGameService.js'
CSS = f'{ROOT}/frontend/src/index.css'
CATALOG = f'{ROOT}/backend/services/gameCatalogService.js'

PUBLIC_PROVIDERS_JS = """export const staticGameProviders = [
  { provider_name: 'JDB', provider_logo: '/images/providers/jdb.png', display_order: 1 },
  { provider_name: 'Horsebook', provider_logo: '/images/providers/horsebook.png', display_order: 2 },
  { provider_name: 'CQ9 Gaming', provider_logo: '/images/providers/cq9.png', display_order: 3 },
  { provider_name: 'KA Gaming', provider_logo: '/images/providers/ka.png', display_order: 4 },
  { provider_name: 'PG Soft', provider_logo: '/images/providers/pg.png', display_order: 5 },
  { provider_name: 'FC', provider_logo: '/images/providers/fc.png', display_order: 6 },
  { provider_name: 'Spadegaming', provider_logo: '/images/providers/spadegaming.png', display_order: 7 },
  { provider_name: 'SBO', provider_logo: '/images/providers/sbo.png', display_order: 8 },
  { provider_name: 'WorldMatch', provider_logo: '/images/providers/worldmatch.png', display_order: 9 },
  { provider_name: 'KM', provider_logo: '/images/providers/km.png', display_order: 10 },
  { provider_name: 'Lady Luck', provider_logo: '/images/providers/ladyluck.png', display_order: 11 },
  { provider_name: 'SABA', provider_logo: '/images/providers/saba.png', display_order: 12 },
  { provider_name: 'Red Tiger', provider_logo: '/images/providers/rt.png', display_order: 13 },
  { provider_name: 'Play8', provider_logo: '/images/providers/play8.png', display_order: 14 },
  { provider_name: 'SBTech', provider_logo: '/images/providers/sbtech.png', display_order: 15 },
  { provider_name: 'Spribe', provider_logo: '/images/providers/spribe.png', display_order: 16 },
  { provider_name: 'JILI', provider_logo: '/images/providers/jili.svg', display_order: 17 },
  { provider_name: 'Evolution', provider_logo: '/images/providers/evolution.svg', display_order: 18 },
  { provider_name: 'Pragmatic Play', provider_logo: '/images/providers/pp.svg', display_order: 19 },
  { provider_name: 'BTI', provider_logo: '/images/providers/bti.svg', display_order: 20 },
];

export default staticGameProviders;
"""

PROVIDER_STRIP_JS = """import { useEffect, useMemo, useState } from 'react';
import { colors } from '../config/theme';
import { staticGameProviders } from '../data/publicGameProviders';
import { getProviderLogoCandidates } from '../utils/providerLogo';
import SectionTitle from './SectionTitle';

const DEFAULT_PROVIDER_LOGO = '/images/providers/default.svg';
const MIN_PROVIDERS = 8;

function pickMarqueeLogo(provider) {
  const candidates = getProviderLogoCandidates({
    code: provider.code || provider.provider_code,
    name: provider.provider_name || provider.name,
    logo: provider.provider_logo || provider.logo,
  });

  return (
    candidates.find((url) => url.endsWith('.png'))
    || candidates.find((url) => /^https?:\\/\\//.test(url) && !url.endsWith('/'))
    || candidates.find((url) => !url.endsWith('default.svg'))
    || DEFAULT_PROVIDER_LOGO
  );
}

function isUsableStripLogo(url) {
  if (!url || url.endsWith('default.svg')) return false;
  if (url.endsWith('.svg') && !url.includes('/uploads/')) {
    return false;
  }
  return true;
}

function ProviderLogo({ provider }) {
  const candidates = useMemo(
    () => getProviderLogoCandidates({
      code: provider.code || provider.provider_code,
      name: provider.provider_name || provider.name,
      logo: provider.provider_logo || provider.logo,
    }),
    [provider],
  );
  const [src, setSrc] = useState(() => pickMarqueeLogo(provider));

  return (
    <img
      src={src}
      alt=""
      role="presentation"
      className="game-providers-marquee__logo"
      loading="lazy"
      draggable={false}
      onError={() => {
        const index = candidates.indexOf(src);
        const next = candidates[index + 1];
        if (next && next !== src) setSrc(next);
      }}
    />
  );
}

export default function ProviderStrip() {
  const [providers, setProviders] = useState(staticGameProviders);

  useEffect(() => {
    let active = true;

    fetch('/api/public/game-providers', { headers: { Accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!active || !Array.isArray(body?.data) || body.data.length < MIN_PROVIDERS) return;

        const seen = new Set();
        const mapped = body.data
          .map((provider, index) => {
            const logo = pickMarqueeLogo(provider);
            const key = provider.code || provider.provider_name;
            if (!key || seen.has(key) || !isUsableStripLogo(logo)) return null;
            seen.add(key);
            return {
              code: provider.code,
              provider_name: provider.provider_name || provider.name,
              provider_logo: logo,
              display_order: provider.display_order || index + 1,
            };
          })
          .filter(Boolean);

        if (mapped.length >= MIN_PROVIDERS) {
          setProviders(mapped);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

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
              key={`${provider.code || provider.provider_name}-${index}`}
              className="game-providers-marquee__item"
            >
              <ProviderLogo provider={provider} />
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

# 1. static provider PNG paths
with sftp.open(PROVIDER_DATA, 'w') as f:
    f.write(PUBLIC_PROVIDERS_JS.encode('utf-8'))
print('WROTE publicGameProviders.js')

# 2. ProviderStrip
with sftp.open(PROVIDER_STRIP, 'w') as f:
    f.write(PROVIDER_STRIP_JS.encode('utf-8'))
print('WROTE ProviderStrip.jsx')

# 3. providerLogo - prefer PNG before SVG
with sftp.open(PROVIDER_LOGO, 'r') as f:
    logo_js = f.read().decode('utf-8').replace('\r\n', '\n')

logo_js = logo_js.replace(
    """  if (slug) {
    push(`/images/providers/${slug}.svg`);
    push(`/images/providers/${slug}.png`);
  }""",
    """  if (slug) {
    push(`/images/providers/${slug}.png`);
    push(`/images/providers/${slug}.svg`);
  }""",
)

with sftp.open(PROVIDER_LOGO, 'w') as f:
    f.write(logo_js.encode('utf-8'))
print('WROTE providerLogo.js')

# 4. API route
with sftp.open(ROUTES, 'r') as f:
    routes = f.read().decode('utf-8').replace('\r\n', '\n')

if 'public/game-providers' not in routes:
    routes = routes.replace(
        "import { getSiteGames, getSiteHotGames, getSiteProviders, getSiteSearch } from '../controllers/siteGameController.js';",
        "import { getPublicGameProviders, getSiteGames, getSiteHotGames, getSiteProviders, getSiteSearch } from '../controllers/siteGameController.js';",
    )
    routes = routes.replace(
        "router.get('/site/search', getSiteSearch);",
        "router.get('/site/search', getSiteSearch);\nrouter.get('/public/game-providers', getPublicGameProviders);",
    )
    with sftp.open(ROUTES, 'w') as f:
        f.write(routes.encode('utf-8'))
    print('WROTE publicSiteGamesRoutes.js')

# 5. listPublicGameProviders return code + raw logo
with sftp.open(CATALOG, 'r') as f:
    cat = f.read().decode('utf-8').replace('\r\n', '\n')

old_return = """  return rows.map((row, index) => ({
    provider_name: row.name,
    provider_logo: resolvePublicProviderLogo(row),
    display_order: index + 1,
  }));"""

new_return = """  return rows.map((row, index) => ({
    code: row.code,
    provider_name: row.name,
    provider_logo: row.provider_logo || null,
    display_order: index + 1,
  }));"""

if 'code: row.code,' not in cat.split('listPublicGameProviders')[1][:500]:
    cat = cat.replace(old_return, new_return, 1)
    with sftp.open(CATALOG, 'w') as f:
        f.write(cat.encode('utf-8'))
    print('WROTE listPublicGameProviders raw logos')

# 6. CSS updates
with sftp.open(CSS, 'r') as f:
    css = f.read().decode('utf-8').replace('\r\n', '\n')

old_item = """.game-providers-marquee__item {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  height: 24px;
  padding: 0;
}

.game-providers-marquee__logo {
  display: block;
  width: auto;
  max-width: 62px;
  height: 22px;
  object-fit: contain;
  object-position: center;
  opacity: 1;
}"""

new_item = """.game-providers-marquee__item {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 76px;
  height: 44px;
  padding: 6px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
}

.game-providers-marquee__logo {
  display: block;
  width: auto;
  max-width: 68px;
  height: 30px;
  object-fit: contain;
  object-position: center;
  opacity: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
}"""

if 'min-width: 76px' not in css:
    css = css.replace(old_item, new_item, 1)
    print('PATCH_OK logo card css')

old_mobile = """@media (max-width: 767px) {
  .game-providers-marquee {
    overflow-x: auto;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .game-providers-marquee::-webkit-scrollbar {
    display: none;
  }

  .game-providers-marquee__track {
    animation: none;
    padding-right: 12px;
  }

  .game-providers-marquee__item {
    scroll-snap-align: start;
  }
}"""

new_mobile = """@media (max-width: 767px) {
  .game-providers-marquee {
    overflow: hidden;
    touch-action: pan-y;
  }

  .game-providers-marquee__track {
    gap: 12px;
    animation: game-providers-marquee 42s linear infinite;
  }

  .game-providers-marquee__item {
    min-width: 68px;
    height: 40px;
    padding: 5px 10px;
  }

  .game-providers-marquee__logo {
    max-width: 58px;
    height: 26px;
  }
}"""

if 'animation: none' in css and '@media (max-width: 767px)' in css:
    css = css.replace(old_mobile, new_mobile, 1)
    print('PATCH_OK mobile marquee css')

with sftp.open(CSS, 'w') as f:
    f.write(css.encode('utf-8'))
print('WROTE index.css')

sftp.close()

_, o, e = c.exec_command(f'cd {ROOT}/backend && node --check services/gameCatalogService.js')
print('backend syntax:', e.read().decode()[:200] or 'ok')

print('Building frontend...')
_, o, e = c.exec_command(f'cd {ROOT}/frontend && npm run build 2>&1', timeout=300000)
combined = o.read().decode('utf-8', 'replace') + e.read().decode('utf-8', 'replace')
print('BUILD_OK' if ('built in' in combined.lower() or '✓' in combined) else combined[-2500:])

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30000)
print(o.read().decode('utf-8', 'replace')[:120])
time.sleep(3)

_, o, _ = c.exec_command('curl -s http://127.0.0.1:3001/api/public/game-providers | python3 -c "import sys,json; d=json.load(sys.stdin); print(\'count\', len(d.get(\'data\',[]))); print(\'sample\', [(x.get(\'code\'), (x.get(\'provider_logo\') or \'\')[:40]) for x in d.get(\'data\',[])[:5]])"')
print(o.read().decode())

c.close()
print('DONE')
