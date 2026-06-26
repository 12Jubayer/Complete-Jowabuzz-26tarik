import {
  listAdminProviders,
  syncProvidersFromExternal,
  toggleProviderEnabled,
} from '../services/gameCatalogService.js';

export async function getAdminProviders(req, res) {
  try {
    const result = await listAdminProviders();
    return res.json(result);
  } catch (error) {
    console.error('Get admin providers error:', error);
    return res.status(500).json({ error: 'Failed to load providers' });
  }
}

export async function patchAdminProviderToggle(req, res) {
  try {
    const result = await toggleProviderEnabled(Number(req.params.id), Boolean(req.body.enabled));
    return res.json(result);
  } catch (error) {
    console.error('Toggle provider error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update provider' });
  }
}

export async function postAdminProvidersSync(req, res) {
  try {
    const result = await syncProvidersFromExternal();
    return res.json({
      message: 'Providers synced',
      ...result,
    });
  } catch (error) {
    console.error('Sync providers error:', error);
    return res.status(500).json({ error: 'Failed to sync providers' });
  }
}

export default {
  getAdminProviders,
  patchAdminProviderToggle,
  postAdminProvidersSync,
};
