import { fetchSiteGames } from './siteGameService';
import { getFeaturedFallbackGames } from '../data/featuredGamesConfig';

function normalizeGame(game) {
  return {
    id: game.code || game.id,
    code: game.code || game.id,
    title: game.title || game.name,
    name: game.name || game.title,
    image: game.image || game.imageUrl,
    multiplier: game.multiplier || null,
    provider: game.provider || game.providerCode,
    providerCode: game.providerCode || game.provider,
    gameId: game.gameId,
    providerId: game.providerId,
  };
}

export async function fetchFeaturedGamesByProvider(provider, { limit = 10 } = {}) {
  const safeLimit = Math.max(1, Math.min(limit, 20));

  try {
    const featuredResult = await fetchSiteGames({
      category: 'featured',
      provider,
      limit: safeLimit,
    });

    if (featuredResult.data?.length) {
      return featuredResult.data.slice(0, safeLimit).map(normalizeGame);
    }

    const providerResult = await fetchSiteGames({
      category: 'all',
      provider,
      limit: safeLimit,
    });

    if (providerResult.data?.length) {
      return providerResult.data.slice(0, safeLimit).map(normalizeGame);
    }
  } catch {
    // use curated fallback catalog
  }

  return getFeaturedFallbackGames(provider).slice(0, safeLimit).map(normalizeGame);
}

export default fetchFeaturedGamesByProvider;
