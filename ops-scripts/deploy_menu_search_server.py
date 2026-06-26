"""Deploy game/provider search for mobile menu drawer - server only."""
import paramiko
import sys
import time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = '103.168.173.101'
USER = 'root'
PASS = 'Jowabuzz@12'
ROOT = '/www/wwwroot/jowabuzz'

SEARCH_FN = r'''
export async function searchSiteCatalog({ query = '', limit = 30 } = {}) {
  const gatewayActive = await isGamesPlayEnabled();
  if (!gatewayActive) {
    return {
      gatewayActive: false,
      gamesEnabled: false,
      message: 'Games are temporarily unavailable',
      data: { games: [], providers: [] },
    };
  }

  const term = String(query || '').trim();
  if (term.length < 2) {
    return {
      gatewayActive: true,
      gamesEnabled: true,
      data: { games: [], providers: [] },
    };
  }

  const pool = getPool();
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 30));
  const providerLimit = Math.min(12, safeLimit);
  const like = `%${term}%`;
  const hiddenProviders = [...HIDDEN_SITE_PROVIDER_CODES];
  const hiddenClause = hiddenProviders.length
    ? `AND p.code NOT IN (${hiddenProviders.map(() => '?').join(', ')})`
    : '';

  const [providerRows] = await pool.query(
    `SELECT p.id, p.code, p.name, p.provider_logo,
            MAX(COALESCE(g.custom_image_url, g.image_url)) AS sample_image,
            MAX(g.name) AS sample_game_name
     FROM providers p
     LEFT JOIN games g ON g.provider_id = p.id AND g.is_active = 1 AND g.status = 'active'
     WHERE p.enabled = 1 AND p.status = 'active'
       AND (p.name LIKE ? OR p.code LIKE ?)
       ${hiddenClause}
     GROUP BY p.id, p.code, p.name, p.provider_logo
     ORDER BY p.name ASC
     LIMIT ?`,
    [like, like, *hiddenProviders, providerLimit],
  );

  const [gameRows] = await pool.query(
    `SELECT g.id, g.code, g.name, g.category, g.image_url, g.custom_image_url, g.provider_id,
            g.is_hot, g.is_featured, g.is_live,
            p.code AS provider_code, p.name AS provider_name
     FROM games g
     INNER JOIN providers p ON p.id = g.provider_id
     WHERE g.is_active = 1 AND g.status = 'active'
       AND (p.enabled = 1 OR p.enabled IS NULL) AND p.status = 'active'
       AND (g.name LIKE ? OR g.code LIKE ? OR p.name LIKE ? OR p.code LIKE ?)
       ${hiddenClause}
     ORDER BY g.is_hot DESC, g.sort_order ASC, g.name ASC
     LIMIT ?`,
    [like, like, like, like, *hiddenProviders, safeLimit],
  );

  return {
    gatewayActive: true,
    gamesEnabled: true,
    data: {
      providers: providerRows.map((row) => ({
        id: row.id,
        code: row.code,
        name: formatProviderDisplayName(row.name, row.sample_game_name),
        logo: resolvePublicProviderLogo({
          ...row,
          provider_logo: row.provider_logo || row.sample_image,
        }),
      })),
      games: gameRows.map(mapSiteGameRow),
    },
  };
}
'''

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, 22, USER, PASS, timeout=30)
sftp = c.open_sftp()

# 1) gameCatalogService.js
CAT = f'{ROOT}/backend/services/gameCatalogService.js'
with sftp.open(CAT, 'r') as f:
    cat = f.read().decode('utf-8').replace('\r\n', '\n')
if 'searchSiteCatalog' not in cat:
    cat = cat.replace(
        'export default {',
        SEARCH_FN + '\nexport default {',
        1,
    )
    cat = cat.replace(
        '  listSiteProviders,\n  listPublicGameProviders,',
        '  listSiteProviders,\n  searchSiteCatalog,\n  listPublicGameProviders,',
        1,
    )
    with sftp.open(CAT, 'w') as f:
        f.write(cat.encode('utf-8'))
    print('PATCH_OK searchSiteCatalog')
else:
    print('SKIP searchSiteCatalog')

# 2) siteGameController.js
CTRL = f'{ROOT}/backend/controllers/siteGameController.js'
with sftp.open(CTRL, 'r') as f:
    ctrl = f.read().decode('utf-8').replace('\r\n', '\n')
if 'getSiteSearch' not in ctrl:
    ctrl = ctrl.replace(
        "import { listHotPublicGames, listPublicGameProviders, listSiteGames, listSiteProviders } from '../services/gameCatalogService.js';",
        "import { listHotPublicGames, listPublicGameProviders, listSiteGames, listSiteProviders, searchSiteCatalog } from '../services/gameCatalogService.js';",
        1,
    )
    ctrl = ctrl.replace(
        'export async function getPublicGameProviders(req, res) {',
        '''export async function getSiteSearch(req, res) {
  try {
    const result = await searchSiteCatalog({
      query: req.query.q || req.query.search || '',
      limit: req.query.limit,
    });
    return res.json(result);
  } catch (error) {
    console.error('Get site search error:', error);
    return res.status(500).json({ error: 'Failed to search games' });
  }
}

export async function getPublicGameProviders(req, res) {''',
        1,
    )
    ctrl = ctrl.replace(
        '  getSiteProviders,\n\n  getPublicGameProviders,',
        '  getSiteProviders,\n  getSiteSearch,\n  getPublicGameProviders,',
        1,
    )
    with sftp.open(CTRL, 'w') as f:
        f.write(ctrl.encode('utf-8'))
    print('PATCH_OK getSiteSearch controller')
else:
    print('SKIP controller')

# 3) routes
ROUTES = f'{ROOT}/backend/routes/publicSiteGamesRoutes.js'
with sftp.open(ROUTES, 'r') as f:
    routes = f.read().decode('utf-8').replace('\r\n', '\n')
if 'getSiteSearch' not in routes:
    routes = routes.replace(
        "import { getSiteGames, getSiteHotGames, getSiteProviders } from '../controllers/siteGameController.js';",
        "import { getSiteGames, getSiteHotGames, getSiteProviders, getSiteSearch } from '../controllers/siteGameController.js';",
        1,
    )
    routes = routes.replace(
        "router.get('/site/providers', getSiteProviders);",
        "router.get('/site/providers', getSiteProviders);\nrouter.get('/site/search', getSiteSearch);",
        1,
    )
    with sftp.open(ROUTES, 'w') as f:
        f.write(routes.encode('utf-8'))
    print('PATCH_OK route /site/search')
else:
    print('SKIP route')

# 4) siteGameService.js frontend
SGS = f'{ROOT}/frontend/src/services/siteGameService.js'
with sftp.open(SGS, 'r') as f:
    sgs = f.read().decode('utf-8').replace('\r\n', '\n')
if 'fetchSiteSearch' not in sgs:
    sgs = sgs.replace(
        'export default {',
        '''export async function fetchSiteSearch({ q = '', limit = 30 } = {}) {
  const response = await fetch(
    `/api/site/search${buildQuery({ q, limit })}`,
    { headers: { Accept: 'application/json' } },
  );
  if (!response.ok) await parseError(response);
  return response.json();
}

export default {''',
        1,
    )
    sgs = sgs.replace(
        '  fetchSiteProviders,',
        '  fetchSiteProviders,\n  fetchSiteSearch,',
        1,
    )
    with sftp.open(SGS, 'w') as f:
        f.write(sgs.encode('utf-8'))
    print('PATCH_OK fetchSiteSearch')
else:
    print('SKIP siteGameService')

# 5) MobileMenuDrawer.jsx
DRAWER = f'{ROOT}/frontend/src/components/MobileMenuDrawer.jsx'
with sftp.open(DRAWER, 'r') as f:
    drawer = f.read().decode('utf-8').replace('\r\n', '\n')
d_orig = drawer

if 'fetchSiteSearch' not in drawer:
    drawer = drawer.replace(
        "import { getGamesByFilter } from '../services/gameService';",
        "import { getGamesByFilter } from '../services/gameService';\nimport { fetchSiteGames, fetchSiteSearch } from '../services/siteGameService';",
        1,
    )

if 'searchProviderView' not in drawer:
    drawer = drawer.replace(
        "  const [searchQuery, setSearchQuery] = useState('');\n\n  const [toastMessage, setToastMessage] = useState('');",
        "  const [searchQuery, setSearchQuery] = useState('');\n  const [searchLoading, setSearchLoading] = useState(false);\n  const [searchResults, setSearchResults] = useState({ games: [], providers: [] });\n  const [searchProviderView, setSearchProviderView] = useState(null);\n  const [providerSearchGames, setProviderSearchGames] = useState([]);\n\n  const [toastMessage, setToastMessage] = useState('');",
        1,
    )

if 'setSearchProviderView(null)' not in drawer.split('useEffect')[2]:
    drawer = drawer.replace(
        "      setSearchQuery('');\n\n      return;",
        "      setSearchQuery('');\n      setSearchResults({ games: [], providers: [] });\n      setSearchProviderView(null);\n      setProviderSearchGames([]);\n      setSearchLoading(false);\n\n      return;",
        1,
    )

search_effect = '''
  useEffect(() => {
    if (!open) return undefined;

    const term = searchQuery.trim();
    if (term.length < 2) {
      setSearchResults({ games: [], providers: [] });
      setSearchProviderView(null);
      setProviderSearchGames([]);
      setSearchLoading(false);
      return undefined;
    }

    let active = true;
    setSearchLoading(true);
    const timer = window.setTimeout(() => {
      fetchSiteSearch({ q: term, limit: 30 })
        .then((result) => {
          if (!active) return;
          const data = result?.data || {};
          setSearchResults({
            games: Array.isArray(data.games) ? data.games : [],
            providers: Array.isArray(data.providers) ? data.providers : [],
          });
          setSearchProviderView(null);
          setProviderSearchGames([]);
        })
        .catch(() => {
          if (!active) return;
          setSearchResults({ games: [], providers: [] });
        })
        .finally(() => {
          if (active) setSearchLoading(false);
        });
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery, open]);
'''

if 'fetchSiteSearch({ q: term' not in drawer:
    drawer = drawer.replace(
        '  }, [activeCategory]);\n\n\n\n  const handleLogout = () => {',
        '  }, [activeCategory]);\n' + search_effect + '\n\n  const handleLogout = () => {',
        1,
    )

handlers = '''
  const handleSearchProviderClick = async (provider) => {
    setSearchProviderView({ code: provider.code, name: provider.name });
    setSearchLoading(true);
    try {
      const result = await fetchSiteGames({ category: 'all', provider: provider.code, limit: 48 });
      setProviderSearchGames(result?.data || []);
    } catch {
      setProviderSearchGames([]);
      showToast('Unable to load provider games');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchGameClick = async (game) => {
    if (!loggedIn) {
      navigate('/auth?tab=login');
      onClose();
      return;
    }

    try {
      await launchOracleGame({
        gameId: game.gameId,
        providerId: game.providerId,
        gameCode: (!game.gameId || !game.providerId) ? (game.code || game.id) : undefined,
      });
      showToast(`${game.title || game.name || 'Game'} opened`);
      onClose();
    } catch (error) {
      showToast(error.message || 'Unable to open game');
    }
  };

'''

if 'handleSearchGameClick' not in drawer:
    drawer = drawer.replace(
        '  const handleMenuLinkClick = async (link) => {',
        handlers + '  const handleMenuLinkClick = async (link) => {',
        1,
    )

if 'isSearchActive' not in drawer:
    drawer = drawer.replace(
        '  const normalizedSearch = searchQuery.trim().toLowerCase();\n\n\n\n  const filteredCategories = useMemo(() => {',
        "  const normalizedSearch = searchQuery.trim().toLowerCase();\n  const isSearchActive = normalizedSearch.length >= 2;\n\n  const filteredCategories = useMemo(() => {",
        1,
    )
    drawer = drawer.replace(
        '    if (!normalizedSearch) return drawerCategories;\n\n    return drawerCategories.filter((category) =>\n\n      category.label.toLowerCase().includes(normalizedSearch),\n\n    );',
        '    if (isSearchActive) return drawerCategories;\n    if (!normalizedSearch) return drawerCategories;\n\n    return drawerCategories.filter((category) =>\n      category.label.toLowerCase().includes(normalizedSearch),\n    );',
        1,
    )
    drawer = drawer.replace(
        '  }, [normalizedSearch]);',
        '  }, [normalizedSearch, isSearchActive]);',
        1,
    )

search_ui = '''
                    {isSearchActive ? (
                      <div className="jb-mobile-drawer__search-panel mx-4 mt-2">
                        {searchProviderView ? (
                          <>
                            <button
                              type="button"
                              className="jb-mobile-drawer__search-back"
                              onClick={() => {
                                setSearchProviderView(null);
                                setProviderSearchGames([]);
                              }}
                            >
                              ← Back
                            </button>
                            <p className="jb-mobile-drawer__search-section-title">
                              {searchProviderView.name} Games
                            </p>
                            {searchLoading ? (
                              <div className="jb-mobile-drawer__flyout-empty">
                                <LogoLoader size="sm" />
                              </div>
                            ) : providerSearchGames.length ? (
                              <div className="jb-mobile-drawer__search-list">
                                {providerSearchGames.map((game) => (
                                  <button
                                    key={game.gameId || game.code}
                                    type="button"
                                    className="jb-mobile-drawer__search-item"
                                    onClick={() => handleSearchGameClick(game)}
                                  >
                                    <img
                                      src={game.image || game.imageUrl || '/images/game-placeholder.png'}
                                      alt={game.title || game.name}
                                      className="jb-mobile-drawer__search-thumb"
                                    />
                                    <span className="jb-mobile-drawer__search-label">
                                      {game.title || game.name}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="jb-mobile-drawer__flyout-empty">No games found</div>
                            )}
                          </>
                        ) : (
                          <>
                            {searchLoading ? (
                              <div className="jb-mobile-drawer__flyout-empty">
                                <LogoLoader size="sm" />
                              </div>
                            ) : (
                              <>
                                {searchResults.providers.length > 0 ? (
                                  <>
                                    <p className="jb-mobile-drawer__search-section-title">Providers</p>
                                    <div className="jb-mobile-drawer__search-list">
                                      {searchResults.providers.map((provider) => (
                                        <button
                                          key={provider.code}
                                          type="button"
                                          className="jb-mobile-drawer__search-item"
                                          onClick={() => handleSearchProviderClick(provider)}
                                        >
                                          <img
                                            src={provider.logo || '/images/providers/default.svg'}
                                            alt={provider.name}
                                            className="jb-mobile-drawer__search-thumb jb-mobile-drawer__search-thumb--round"
                                          />
                                          <span className="jb-mobile-drawer__search-label">{provider.name}</span>
                                          <span className="jb-mobile-drawer__search-chevron">›</span>
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                ) : null}
                                {searchResults.games.length > 0 ? (
                                  <>
                                    <p className="jb-mobile-drawer__search-section-title">Games</p>
                                    <div className="jb-mobile-drawer__search-list">
                                      {searchResults.games.map((game) => (
                                        <button
                                          key={game.gameId || game.code}
                                          type="button"
                                          className="jb-mobile-drawer__search-item"
                                          onClick={() => handleSearchGameClick(game)}
                                        >
                                          <img
                                            src={game.image || game.imageUrl || '/images/game-placeholder.png'}
                                            alt={game.title || game.name}
                                            className="jb-mobile-drawer__search-thumb"
                                          />
                                          <span className="jb-mobile-drawer__search-label">
                                            {game.title || game.name}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                ) : null}
                                {!searchLoading
                                  && !searchResults.providers.length
                                  && !searchResults.games.length ? (
                                    <div className="jb-mobile-drawer__flyout-empty">No results found</div>
                                  ) : null}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    ) : null}

'''

if 'jb-mobile-drawer__search-panel' not in drawer:
    drawer = drawer.replace(
        '                    </div>\n\n                  </div>\n\n\n\n                  <div className="jb-mobile-drawer__panel mx-4 mt-2">',
        '                    </div>\n\n' + search_ui + '\n                  </div>\n\n\n\n                  {!isSearchActive ? (\n                  <div className="jb-mobile-drawer__panel mx-4 mt-2">',
        1,
    )
    drawer = drawer.replace(
        '                    })}\n\n                  </div>\n\n\n\n                  <div className="jb-mobile-drawer__panel mx-4 mt-3">',
        '                    })}\n\n                  </div>\n                  ) : null}\n\n\n\n                  {!isSearchActive ? (\n                  <div className="jb-mobile-drawer__panel mx-4 mt-3">',
        1,
    )
    drawer = drawer.replace(
        '                    ))}\n\n                  </div>\n\n\n\n                  <div className="mx-4 mt-3">',
        '                    ))}\n\n                  </div>\n                  ) : null}\n\n\n\n                  <div className="mx-4 mt-3">',
        1,
    )
    print('PATCH_OK MobileMenuDrawer UI')
else:
    print('SKIP drawer UI')

if drawer != d_orig:
    with sftp.open(DRAWER, 'w') as f:
        f.write(drawer.encode('utf-8'))

# 6) CSS
CSS = f'{ROOT}/frontend/src/index.css'
with sftp.open(CSS, 'r') as f:
    css = f.read().decode('utf-8').replace('\r\n', '\n')
if 'jb-mobile-drawer__search-panel' not in css:
    css = css.replace(
        '.jb-mobile-drawer__search-input::placeholder {\n  color: rgba(203, 213, 225, 0.55);\n}',
        '''.jb-mobile-drawer__search-input::placeholder {
  color: rgba(203, 213, 225, 0.55);
}

.jb-mobile-drawer__search-panel {
  overflow: hidden;
  border-radius: 0.75rem;
  border: 1px solid rgba(34, 197, 94, 0.25);
  background-color: #0d1528;
  padding: 0.5rem;
  max-height: min(52vh, 420px);
  overflow-y: auto;
}

.jb-mobile-drawer__search-section-title {
  margin: 0.5rem 0 0.35rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(34, 197, 94, 0.9);
}

.jb-mobile-drawer__search-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.jb-mobile-drawer__search-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  border-radius: 0.5rem;
  padding: 0.45rem 0.5rem;
  text-align: left;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(34, 197, 94, 0.15);
  color: #fff;
}

.jb-mobile-drawer__search-item:active {
  background: rgba(34, 197, 94, 0.12);
}

.jb-mobile-drawer__search-thumb {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.45rem;
  object-fit: cover;
  flex-shrink: 0;
  background: #111827;
}

.jb-mobile-drawer__search-thumb--round {
  border-radius: 9999px;
}

.jb-mobile-drawer__search-label {
  min-width: 0;
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jb-mobile-drawer__search-chevron {
  color: rgba(148, 163, 184, 0.9);
  font-size: 1.1rem;
}

.jb-mobile-drawer__search-back {
  margin-bottom: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #22c55e;
}''',
        1,
    )
    with sftp.open(CSS, 'w') as f:
        f.write(css.encode('utf-8'))
    print('PATCH_OK CSS')
else:
    print('SKIP CSS')

sftp.close()

_, o, _ = c.exec_command(f'cd {ROOT}/backend && node --check services/gameCatalogService.js && node --check controllers/siteGameController.js', timeout=30)
print('syntax:', o.read().decode('utf-8', 'replace'))

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30000)
print(o.read().decode('utf-8', 'replace')[:250])
time.sleep(3)

_, o, _ = c.exec_command("curl -s 'http://127.0.0.1:3001/api/site/search?q=aviator&limit=5'", timeout=30)
print('API test:', o.read().decode('utf-8', 'replace')[:800])

_, o, _ = c.exec_command(f'cd {ROOT}/frontend && npm run build 2>&1 | tail -6', timeout=300000)
print(o.read().decode('utf-8', 'replace'))

c.close()
print('DEPLOY_DONE')
