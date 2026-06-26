"""Add provider logo file upload - server only."""
import paramiko
import sys
import time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = '/www/wwwroot/jowabuzz'

PROVIDER_UPLOAD_MW = """import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'providers');
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.png';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
    cb(new Error('Only JPG, PNG, WEBP, and SVG images are allowed'));
    return;
  }
  cb(null, true);
}

export const providerLogoUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

export default providerLogoUpload;
"""

UPLOAD_FN = """
export async function uploadProviderLogo(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Logo file is required' });
    }

    const logoUrl = `/uploads/providers/${req.file.filename}`;

    return res.json({
      success: true,
      logoUrl,
      imageUrl: logoUrl,
      message: 'Provider logo uploaded successfully',
    });
  } catch (error) {
    console.error('Upload provider logo error:', error);
    return res.status(500).json({ error: 'Failed to upload provider logo' });
  }
}
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('103.168.173.101', 22, 'root', 'Jowabuzz@12', timeout=30)
sftp = c.open_sftp()

# 1) middleware file
mw_path = f'{ROOT}/backend/middleware/providerLogoUpload.js'
try:
    sftp.stat(mw_path)
    print('SKIP middleware exists')
except FileNotFoundError:
    with sftp.open(mw_path, 'w') as f:
        f.write(PROVIDER_UPLOAD_MW.encode('utf-8'))
    print('CREATED providerLogoUpload.js')

# 2) adminUploadController
ctrl_path = f'{ROOT}/backend/controllers/adminUploadController.js'
with sftp.open(ctrl_path, 'r') as f:
    ctrl = f.read().decode('utf-8').replace('\r\n', '\n')
if 'uploadProviderLogo' not in ctrl:
    ctrl = ctrl.replace(
        'export default uploadSliderImage;',
        UPLOAD_FN + '\nexport default uploadSliderImage;',
    )
    with sftp.open(ctrl_path, 'w') as f:
        f.write(ctrl.encode('utf-8'))
    print('PATCH_OK uploadProviderLogo controller')

# 3) adminUploadRoutes
routes_path = f'{ROOT}/backend/routes/adminUploadRoutes.js'
with sftp.open(routes_path, 'r') as f:
    routes = f.read().decode('utf-8').replace('\r\n', '\n')
if 'provider-logo' not in routes:
    routes = routes.replace(
        "  uploadSliderImage,\n} from '../controllers/adminUploadController.js';",
        "  uploadSliderImage,\n  uploadProviderLogo,\n} from '../controllers/adminUploadController.js';",
        1,
    )
    routes = routes.replace(
        "import { sliderImageUpload } from '../middleware/sliderImageUpload.js';",
        "import { sliderImageUpload } from '../middleware/sliderImageUpload.js';\nimport { providerLogoUpload } from '../middleware/providerLogoUpload.js';",
        1,
    )
    routes = routes.replace(
        "router.post(\n  '/upload/game-image',",
        "router.post(\n  '/upload/provider-logo',\n  handleUpload(providerLogoUpload, 'Provider logo must be 2MB or smaller'),\n  uploadProviderLogo,\n);\n\nrouter.post(\n  '/upload/game-image',",
        1,
    )
    with sftp.open(routes_path, 'w') as f:
        f.write(routes.encode('utf-8'))
    print('PATCH_OK upload route')

# 4) adminRoutePermissions
perm_path = f'{ROOT}/backend/config/adminRoutePermissions.js'
with sftp.open(perm_path, 'r') as f:
    perm = f.read().decode('utf-8').replace('\r\n', '\n')
if 'provider-logo' not in perm:
    perm = perm.replace(
        "/^\\/upload\\/game-image(\\/|$)/.test(path),",
        "/^\\/upload\\/(game-image|provider-logo)(\\/|$)/.test(path),",
        1,
    )
    with sftp.open(perm_path, 'w') as f:
        f.write(perm.encode('utf-8'))
    print('PATCH_OK permissions')

# 5) adminGameService frontend
svc_path = f'{ROOT}/frontend/src/services/adminGameService.js'
with sftp.open(svc_path, 'r') as f:
    svc = f.read().decode('utf-8').replace('\r\n', '\n')
if 'uploadAdminProviderLogo' not in svc:
    svc = svc.replace(
        'export async function updateAdminProviderDetails(id, payload) {',
        '''export async function uploadAdminProviderLogo(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await adminFetch('/api/admin/upload/provider-logo', {
    method: 'POST',
    headers: getAdminAuthHeaders(false),
    body: formData,
  });
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function updateAdminProviderDetails(id, payload) {''',
        1,
    )
    svc = svc.replace(
        '  updateAdminProviderDetails,',
        '  uploadAdminProviderLogo,\n  updateAdminProviderDetails,',
        1,
    )
    with sftp.open(svc_path, 'w') as f:
        f.write(svc.encode('utf-8'))
    print('PATCH_OK adminGameService')

# 6) AdminGamesPage
page_path = f'{ROOT}/frontend/src/pages/admin/AdminGamesPage.jsx'
with sftp.open(page_path, 'r') as f:
    page = f.read().decode('utf-8').replace('\r\n', '\n')
p_orig = page

if 'uploadAdminProviderLogo' not in page:
    page = page.replace(
        '  updateAdminProviderDetails,',
        '  updateAdminProviderDetails,\n  uploadAdminProviderLogo,',
        1,
    )

if 'providerLogoInputRef' not in page:
    page = page.replace(
        "  const [providerLogoDraft, setProviderLogoDraft] = useState('');",
        "  const [providerLogoDraft, setProviderLogoDraft] = useState('');\n  const providerLogoInputRef = useRef(null);",
        1,
    )
    page = page.replace(
        "import { useCallback, useEffect, useMemo, useState } from 'react';",
        "import { useCallback, useEffect, useMemo, useRef, useState } from 'react';",
        1,
    )

handler = '''
  const handleProviderLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setTogglingKey('provider-logo-upload');
    try {
      const result = await uploadAdminProviderLogo(file);
      const logoUrl = result.logoUrl || result.imageUrl;
      if (!logoUrl) throw new Error('Upload failed');
      setProviderLogoDraft(logoUrl);
      showToast('Logo uploaded. Click Save to apply.', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to upload logo');
    } finally {
      setTogglingKey('');
    }
  };
'''

if 'handleProviderLogoUpload' not in page:
    page = page.replace(
        '  const handleProviderDetailsSave = async (providerId) => {',
        handler + '\n  const handleProviderDetailsSave = async (providerId) => {',
        1,
    )

old_logo_block = '''                              <input
                                value={providerLogoDraft}
                                onChange={(event) => setProviderLogoDraft(event.target.value)}
                                placeholder="Logo URL (https://... or /images/providers/...)"
                                className="admin-filter-control min-w-[220px] rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900"
                              />
                              <div className="flex flex-wrap items-center gap-2">'''

new_logo_block = '''                              <input
                                value={providerLogoDraft}
                                onChange={(event) => setProviderLogoDraft(event.target.value)}
                                placeholder="Logo URL (https://... or /images/providers/...)"
                                className="admin-filter-control min-w-[220px] rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900"
                              />
                              <input
                                ref={providerLogoInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
                                className="hidden"
                                onChange={handleProviderLogoUpload}
                              />
                              <button
                                type="button"
                                disabled={togglingKey === 'provider-logo-upload'}
                                onClick={() => providerLogoInputRef.current?.click()}
                                className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                              >
                                Upload Logo
                              </button>
                              {providerLogoDraft ? (
                                <img
                                  src={providerLogoDraft}
                                  alt="Logo preview"
                                  className="h-12 w-12 rounded-lg border border-slate-200 object-cover bg-white"
                                  onError={(event) => { event.currentTarget.src = '/images/providers/default.svg'; }}
                                />
                              ) : null}
                              <div className="flex flex-wrap items-center gap-2">'''

if 'Upload Logo' not in page and old_logo_block in page:
    page = page.replace(old_logo_block, new_logo_block, 1)
    print('PATCH_OK AdminGamesPage upload button')

if page != p_orig:
    with sftp.open(page_path, 'w') as f:
        f.write(page.encode('utf-8'))

sftp.close()

_, o, e = c.exec_command(
    f'mkdir -p {ROOT}/backend/uploads/providers && '
    f'cd {ROOT}/backend && node --check middleware/providerLogoUpload.js && '
    'node --check controllers/adminUploadController.js && node --check routes/adminUploadRoutes.js',
    timeout=30,
)
print('syntax:', o.read().decode(), e.read().decode()[:300])

_, o, _ = c.exec_command('pm2 restart jowabuzz --update-env', timeout=30000)
print(o.read().decode('utf-8', 'replace')[:200])
time.sleep(2)

_, o, _ = c.exec_command(f'cd {ROOT}/frontend && npm run build 2>&1 | tail -6', timeout=300000)
print(o.read().decode('utf-8', 'replace'))

c.close()
print('DONE')
