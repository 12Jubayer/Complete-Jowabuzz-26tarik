"""Sports duplicate fix + admin provider edit API - server only."""
import paramiko
import sys
import time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = '/www/wwwroot/jowabuzz'

UPDATE_FN = '''
export async function updateProviderDetails(providerId, { providerName, providerLogo, enabled } = {}) {
  const pool = getPool();
  const updates = [];
  const params = [];

  if (providerName !== undefined) {
    const name = String(providerName || '').trim();
    if (!name) {
      const error = new Error('Provider name is required');
      error.statusCode = 400;
      throw error;
    }
    updates.push('name = ?');
    params.push(name);
  }

  if (providerLogo !== undefined) {
    const logo = String(providerLogo || '').trim();
    updates.push('provider_logo = ?');
    params.push(logo || null);
  }

  if (enabled !== undefined) {
    const normalizedValue = enabled ? 1 : 0;
    updates.push('enabled = ?');
    params.push(normalizedValue);
    updates.push('status = ?');
    params.push(enabled ? 'active' : 'inactive');
  }

  if (!updates.length) {
    const error = new Error('No fields to update');
    error.statusCode = 400;
    throw error;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(providerId);

  const [result] = await pool.query(
    `UPDATE providers SET ${updates.join(', ')} WHERE id = ?`,
    params,
  );

  if (!result.affectedRows) {
    const error = new Error('Provider not found');
    error.statusCode = 404;
    throw error;
  }

  const [[row]] = await pool.query(
    `SELECT id, code, name, provider_logo, enabled, status, created_at, updated_at
     FROM providers WHERE id = ? LIMIT 1`,
    [providerId],
  );

  return { data: mapProviderRow(row), message: 'Provider updated' };
}
'''

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

# 1) gameCatalogService - add updateProviderDetails
CAT = f'{ROOT}/backend/services/gameCatalogService.js'
with sftp.open(CAT, 'r') as f:
    cat = f.read().decode('utf-8').replace('\r\n', '\n')
if 'updateProviderDetails' not in cat:
    cat = cat.replace(
        'export async function toggleProviderEnabled(providerId, enabled) {',
        UPDATE_FN + '\nexport async function toggleProviderEnabled(providerId, enabled) {',
        1,
    )
    cat = cat.replace(
        '  toggleProviderEnabled,',
        '  updateProviderDetails,\n  toggleProviderEnabled,',
        1,
    )
    with sftp.open(CAT, 'w') as f:
        f.write(cat.encode('utf-8'))
    print('PATCH_OK updateProviderDetails service')
else:
    print('SKIP service')

# 2) adminProviderController
CTRL = f'{ROOT}/backend/controllers/adminProviderController.js'
with sftp.open(CTRL, 'r') as f:
    ctrl = f.read().decode('utf-8').replace('\r\n', '\n')
if 'patchAdminProviderDetails' not in ctrl:
    ctrl = ctrl.replace(
        "import {\n  listAdminProviders,\n  syncProvidersFromExternal,\n  toggleProviderEnabled,\n} from '../services/gameCatalogService.js';",
        "import {\n  listAdminProviders,\n  syncProvidersFromExternal,\n  toggleProviderEnabled,\n  updateProviderDetails,\n} from '../services/gameCatalogService.js';",
        1,
    )
    ctrl = ctrl.replace(
        'export async function postAdminProvidersSync(req, res) {',
        '''export async function patchAdminProviderDetails(req, res) {
  try {
    const result = await updateProviderDetails(Number(req.params.id), {
      providerName: req.body.providerName,
      providerLogo: req.body.providerLogo,
      enabled: req.body.enabled,
    });
    return res.json(result);
  } catch (error) {
    console.error('Update provider details error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update provider' });
  }
}

export async function postAdminProvidersSync(req, res) {''',
        1,
    )
    ctrl = ctrl.replace(
        '  patchAdminProviderToggle,\n  postAdminProvidersSync,',
        '  patchAdminProviderToggle,\n  patchAdminProviderDetails,\n  postAdminProvidersSync,',
        1,
    )
    with sftp.open(CTRL, 'w') as f:
        f.write(ctrl.encode('utf-8'))
    print('PATCH_OK adminProviderController')
else:
    print('SKIP controller')

# 3) routes
ROUTES = f'{ROOT}/backend/routes/adminGameRoutes.js'
with sftp.open(ROUTES, 'r') as f:
    routes = f.read().decode('utf-8').replace('\r\n', '\n')
if 'patchAdminProviderDetails' not in routes:
    routes = routes.replace(
        "  getAdminProviders,\n  patchAdminProviderToggle,\n  postAdminProvidersSync,\n} from '../controllers/adminProviderController.js';",
        "  getAdminProviders,\n  patchAdminProviderToggle,\n  patchAdminProviderDetails,\n  postAdminProvidersSync,\n} from '../controllers/adminProviderController.js';",
        1,
    )
    routes = routes.replace(
        "router.patch('/providers/:id/toggle', patchAdminProviderToggle);",
        "router.patch('/providers/:id/toggle', patchAdminProviderToggle);\nrouter.patch('/providers/:id/update-details', patchAdminProviderDetails);",
        1,
    )
    with sftp.open(ROUTES, 'w') as f:
        f.write(routes.encode('utf-8'))
    print('PATCH_OK route')
else:
    print('SKIP route')

# 4) AdminGamesPage - logo edit + provider search
PAGE = f'{ROOT}/frontend/src/pages/admin/AdminGamesPage.jsx'
with sftp.open(PAGE, 'r') as f:
    page = f.read().decode('utf-8').replace('\r\n', '\n')
p_orig = page

if 'providerLogoDraft' not in page:
    page = page.replace(
        "  const [providerNameDraft, setProviderNameDraft] = useState('');",
        "  const [providerNameDraft, setProviderNameDraft] = useState('');\n  const [providerLogoDraft, setProviderLogoDraft] = useState('');\n  const [providerSearch, setProviderSearch] = useState('');",
        1,
    )

old_save = '''  const handleProviderNameSave = async (providerId) => {
    const trimmed = providerNameDraft.trim();
    if (!trimmed) {
      showToast('Provider name is required');
      return;
    }

    setTogglingKey(`provider-name-${providerId}`);
    try {
      const result = await updateAdminProviderDetails(providerId, { providerName: trimmed });
      const updated = result.data;
      setProviders((current) =>
        current.map((row) => (row.id === providerId ? { ...row, ...updated } : row)),
      );
      setEditingProviderId(null);
      showToast('Provider name updated', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to update provider name');
    } finally {
      setTogglingKey('');
    }
  };'''

new_save = '''  const handleProviderDetailsSave = async (providerId) => {
    const trimmed = providerNameDraft.trim();
    if (!trimmed) {
      showToast('Provider name is required');
      return;
    }

    setTogglingKey(`provider-name-${providerId}`);
    try {
      const result = await updateAdminProviderDetails(providerId, {
        providerName: trimmed,
        providerLogo: providerLogoDraft.trim(),
      });
      const updated = result.data;
      setProviders((current) =>
        current.map((row) => (row.id === providerId ? { ...row, ...updated } : row)),
      );
      setEditingProviderId(null);
      showToast('Provider updated', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to update provider');
    } finally {
      setTogglingKey('');
    }
  };

  const filteredAdminProviders = useMemo(() => {
    const term = providerSearch.trim().toLowerCase();
    if (!term) return providers;
    return providers.filter((provider) =>
      String(provider.providerName || '').toLowerCase().includes(term)
      || String(provider.providerCode || '').toLowerCase().includes(term),
    );
  }, [providers, providerSearch]);'''

if 'handleProviderDetailsSave' not in page and old_save in page:
    page = page.replace(old_save, new_save, 1)
    print('PATCH_OK save handler')

if 'useMemo' not in page.split('export default')[0]:
    page = page.replace(
        "import { useCallback, useEffect, useState } from 'react';",
        "import { useCallback, useEffect, useMemo, useState } from 'react';",
        1,
    )

old_table_head = '''        ) : activeTab === 'provider' ? (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Provider</th>
                    <th className="px-4 py-3 font-semibold">Enabled</th>
                  </tr>
                </thead>'''

new_table_head = '''        ) : activeTab === 'provider' ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <input
                type="text"
                value={providerSearch}
                onChange={(event) => setProviderSearch(event.target.value)}
                placeholder="Search provider name or code..."
                className="admin-filter-control w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              />
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Logo</th>
                    <th className="px-4 py-3 font-semibold">Code</th>
                    <th className="px-4 py-3 font-semibold">Provider</th>
                    <th className="px-4 py-3 font-semibold">Enabled</th>
                  </tr>
                </thead>'''

if 'providerSearch' in page and 'Search provider name' not in page:
    page = page.replace(old_table_head, new_table_head, 1)
    print('PATCH_OK table header')

# Replace provider row rendering
old_row_start = '''                  ) : (
                    providers.map((provider) => (
                      <tr key={provider.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {editingProviderId === provider.id ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                value={providerNameDraft}
                                onChange={(event) => setProviderNameDraft(event.target.value)}
                                className="admin-filter-control min-w-[180px] rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900"
                              />
                              <button
                                type="button"
                                disabled={togglingKey === `provider-name-${provider.id}`}
                                onClick={() => handleProviderNameSave(provider.id)}
                                className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingProviderId(null)}
                                className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{provider.providerName}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProviderId(provider.id);
                                  setProviderNameDraft(provider.providerName || '');
                                }}
                                className="rounded-md border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </td>'''

new_row_start = '''                  ) : (
                    filteredAdminProviders.map((provider) => (
                      <tr key={provider.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3">
                          <img
                            src={provider.providerLogo || '/images/providers/default.svg'}
                            alt={provider.providerName}
                            className="h-10 w-10 rounded-lg border border-slate-200 object-cover bg-white"
                            onError={(event) => { event.currentTarget.src = '/images/providers/default.svg'; }}
                          />
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-slate-500">{provider.providerCode}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {editingProviderId === provider.id ? (
                            <div className="flex flex-col gap-2">
                              <input
                                value={providerNameDraft}
                                onChange={(event) => setProviderNameDraft(event.target.value)}
                                placeholder="Provider name"
                                className="admin-filter-control min-w-[180px] rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900"
                              />
                              <input
                                value={providerLogoDraft}
                                onChange={(event) => setProviderLogoDraft(event.target.value)}
                                placeholder="Logo URL (https://... or /images/providers/...)"
                                className="admin-filter-control min-w-[220px] rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900"
                              />
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  disabled={togglingKey === `provider-name-${provider.id}`}
                                  onClick={() => handleProviderDetailsSave(provider.id)}
                                  className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingProviderId(null)}
                                  className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{provider.providerName}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProviderId(provider.id);
                                  setProviderNameDraft(provider.providerName || '');
                                  setProviderLogoDraft(provider.providerLogo || '');
                                }}
                                className="rounded-md border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </td>'''

if 'filteredAdminProviders.map' not in page and old_row_start in page:
    page = page.replace(old_row_start, new_row_start, 1)
    print('PATCH_OK table rows')

# close extra div for provider tab
if 'Search provider name or code' in page and '</div>\n        ) : (' not in page:
    page = page.replace(
        '              </table>\n            </div>\n          </div>\n        ) : (',
        '              </table>\n            </div>\n          </div>\n          </div>\n        ) : (',
        1,
    )

# fix colspan for loading/empty
page = page.replace(
    'colSpan={2}',
    'colSpan={4}',
)

if page != p_orig:
    with sftp.open(PAGE, 'w') as f:
        f.write(page.encode('utf-8'))
    print('WROTE AdminGamesPage')
else:
    print('NO page changes')

sftp.close()

# 5) DB fixes - duplicate lucky + logos from games
sql = r'''
mysql -uroot -p656940d50e847e3f jowabuzz <<'SQL'
-- disable duplicate Lucky Sports provider (keep LUCKYSPORTS)
UPDATE providers SET enabled=0, status='inactive', name='Lucky Sports (Old)', updated_at=NOW() WHERE code='LUCKSPORT';
UPDATE providers SET name='Lucky Sports', updated_at=NOW() WHERE code='LUCKYSPORTS';

-- fill missing sports provider logos from game thumbnails
UPDATE providers p
JOIN (
  SELECT g.provider_id, MAX(COALESCE(g.custom_image_url, g.image_url)) AS logo
  FROM games g
  WHERE g.category='sports' AND g.is_active=1 AND g.status='active'
    AND COALESCE(g.custom_image_url, g.image_url) IS NOT NULL
    AND COALESCE(g.custom_image_url, g.image_url) != ''
  GROUP BY g.provider_id
) src ON src.provider_id = p.id
SET p.provider_logo = src.logo
WHERE (p.provider_logo IS NULL OR p.provider_logo = '')
  AND p.status='active' AND p.enabled=1;

SELECT code,name,enabled,LEFT(provider_logo,60) logo FROM providers WHERE code IN ('LUCKSPORT','LUCKYSPORTS');
SQL
'''
_, o, e = c.exec_command(sql, timeout=60)
print('DB:', o.read().decode('utf-8', 'replace'))
print(e.read().decode('utf-8', 'replace')[:300])

_, o, e = c.exec_command(f'cd {ROOT}/backend && node --check services/gameCatalogService.js && node --check controllers/adminProviderController.js', timeout=30)
print('syntax ok')

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30000)
print(o.read().decode('utf-8', 'replace')[:200])
time.sleep(3)

_, o, _ = c.exec_command("curl -s 'http://127.0.0.1:3001/api/site/providers?category=sports' | python3 -c \"import sys,json;d=json.load(sys.stdin);[print(x['code'],x['name']) for x in d.get('data',[])]\"", timeout=30)
print('sports providers after fix:\n', o.read().decode('utf-8', 'replace'))

_, o, _ = c.exec_command(f'cd {ROOT}/frontend && npm run build 2>&1 | tail -5', timeout=300000)
print(o.read().decode('utf-8', 'replace'))

c.close()
print('DONE')
