import { listHotPublicGames, listPublicGameProviders, listSiteGames, listSiteProviders } from '../services/gameCatalogService.js';



export async function getSiteHotGames(req, res) {

  try {

    const result = await listHotPublicGames({

      page: req.query.page,

      limit: req.query.limit,

    });



    return res.json(result);

  } catch (error) {

    console.error('Get hot site games error:', error);

    return res.status(500).json({ error: 'Failed to load hot games' });

  }

}



export async function getSiteGames(req, res) {

  try {

    const result = await listSiteGames({

      category: req.query.category || 'hot',

      provider: req.query.provider || '',

      search: req.query.search || req.query.q || '',

      page: req.query.page,

      limit: req.query.limit,

    });



    return res.json(result);

  } catch (error) {

    console.error('Get site games error:', error);

    return res.status(500).json({ error: 'Failed to load games' });

  }

}



export async function getSiteProviders(req, res) {

  try {

    const result = await listSiteProviders({ category: req.query.category || '' });

    return res.json(result);

  } catch (error) {

    console.error('Get site providers error:', error);

    return res.status(500).json({ error: 'Failed to load providers' });

  }

}



export async function getPublicGameProviders(req, res) {
  try {
    const providers = await listPublicGameProviders();
    return res.json({ success: true, data: providers });
  } catch (error) {
    console.error('Get public game providers error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load game providers' });
  }
}

export default {

  getSiteHotGames,

  getSiteGames,

  getSiteProviders,

  getPublicGameProviders,

};

