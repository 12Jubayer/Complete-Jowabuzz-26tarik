import {
  addAdminHotGame,
  bulkToggleGames,
  bulkUpdateGameFlags,
  listAdminGames,
  listAdminHotGames,
  removeAdminHotGame,
  searchAdminGames,
  syncGamesFromOracle,
  toggleGameField,
  updateGameFlags,
} from '../services/gameCatalogService.js';

function parseToggleField(rawField) {
  const map = {
    hot: 'is_hot',
    featured: 'is_featured',
    live: 'is_live',
    active: 'is_active',
    is_hot: 'is_hot',
    is_featured: 'is_featured',
    is_live: 'is_live',
    is_active: 'is_active',
  };

  return map[String(rawField || '').trim().toLowerCase()] || null;
}

export async function getAdminGames(req, res) {



  try {
    const result = await listAdminGames({
      tab: req.query.tab || 'all',
      search: req.query.search || '',
      providerCode: req.query.provider || req.query.providerCode || '',
      page: req.query.page,
      limit: req.query.limit,
    });



    return res.json(result);
  } catch (error) {
    console.error('Get admin games error:', error);
    return res.status(500).json({ error: 'Failed to load games' });
  }
}

export async function putAdminGameUpdateFlags(req, res) {
  try {
    const result = await updateGameFlags(Number(req.params.id), req.body || {});
    return res.json(result);
  } catch (error) {
    console.error('Update game flags error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update game' });
  }
}

export async function putAdminGamesBulkUpdateFlags(req, res) {
  try {
    const result = await bulkUpdateGameFlags({
      updates: req.body.updates,
      gameIds: req.body.gameIds,
      flags: req.body.flags,
    });
    return res.json(result);
  } catch (error) {
    console.error('Bulk update game flags error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to bulk update games' });
  }
}

export async function patchAdminGameToggle(req, res) {
  const field = parseToggleField(req.body.field);
  if (!field) {
    return res.status(400).json({ error: 'Invalid toggle field' });
  }

  try {
    const result = await toggleGameField(Number(req.params.id), field, Boolean(req.body.value));
    return res.json(result);
  } catch (error) {
    console.error('Toggle game error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update game' });
  }
}

export async function postAdminGamesBulkToggle(req, res) {
  const field = parseToggleField(req.body.field);
  if (!field) {
    return res.status(400).json({ error: 'Invalid toggle field' });
  }

  try {
    const result = await bulkToggleGames({
      gameIds: (req.body.gameIds || []).map(Number).filter(Boolean),
      field,
      value: Boolean(req.body.value),
    });
    return res.json(result);
  } catch (error) {
    console.error('Bulk toggle games error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to bulk update games' });
  }
}

export async function postAdminGamesSyncOracle(req, res) {
  try {
    const result = await syncGamesFromOracle();
    return res.json({
      message: 'Games synced from Oracle',
      ...result,
    });
  } catch (error) {
    console.error('Sync oracle games error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to sync games from Oracle' });
  }
}

export async function getAdminHotGames(req, res) {
  try {
    const result = await listAdminHotGames();
    return res.json(result);
  } catch (error) {
    console.error('Get admin hot games error:', error);
    return res.status(500).json({ error: 'Failed to load hot games' });
  }
}

export async function getAdminGamesSearch(req, res) {
  try {
    const result = await searchAdminGames(req.query.q || req.query.search || '', req.query.limit);
    return res.json(result);
  } catch (error) {
    console.error('Search admin games error:', error);
    return res.status(500).json({ error: 'Failed to search games' });
  }
}

export async function postAdminHotGame(req, res) {
  const gameId = Number(req.body.gameId || req.body.id);
  if (!gameId) {
    return res.status(400).json({ error: 'gameId is required' });
  }

  try {
    const result = await addAdminHotGame(gameId);
    return res.status(201).json(result);
  } catch (error) {
    console.error('Add hot game error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to add hot game' });
  }
}

export async function deleteAdminHotGame(req, res) {
  const gameId = Number(req.params.id);
  if (!gameId) {
    return res.status(400).json({ error: 'Invalid game id' });
  }

  try {
    const result = await removeAdminHotGame(gameId);
    return res.json(result);
  } catch (error) {
    console.error('Remove hot game error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to remove hot game' });
  }
}

export default {
  getAdminGames,
  putAdminGameUpdateFlags,
  putAdminGamesBulkUpdateFlags,
  patchAdminGameToggle,
  postAdminGamesBulkToggle,
  postAdminGamesSyncOracle,
  getAdminHotGames,
  getAdminGamesSearch,
  postAdminHotGame,
  deleteAdminHotGame,
};
