import { gamesCatalog } from '../data/gamesCatalog';
import { menuProviders } from '../data/menuProviders';
import { normalizeCategoryForApi } from '../utils/categoryNavigation';
import { getCachedProviders, setCachedProviders } from './providerCacheService';
import { fetchSiteGames, fetchSiteHotGames, fetchSiteProviders } from './siteGameService';

const HOT_GAMES_CACHE_MS = 60 * 1000;
const HOME_HOT_GAMES_LIMIT = 48;
let hotGamesCache = null;

async function fetchHotGamesCached(limit = HOME_HOT_GAMES_LIMIT) {
  const now = Date.now();
  if (hotGamesCache && now - hotGamesCache.ts < HOT_GAMES_CACHE_MS) {
    return hotGamesCache.result;
  }

  const result = await fetchSiteHotGames({ limit });
  hotGamesCache = { result, ts: now };
  return result;
}

const CATEGORY_KEY_MAP = {
  hot: 'hotGames',
  slot: 'slots',
  slots: 'slots',
  casino: 'casino',
  sports: 'sports',
  crash: 'crash',
  table: 'table',
  fishing: 'fishing',
  arcade: 'arcade',
  lottery: 'lottery',
  featured: 'featured',
  live: 'live',
};

function resolveCategoryKey(category) {
  return CATEGORY_KEY_MAP[category] || category;
}

const HIDDEN_SPORTS_UI_TITLES = new Set([
  '568win Sportsbook',
  'SABA Sports',
  'SBO Sportsbook',
  'SBO VirtualSports (VS)',
]);

const HIDDEN_SPORTS_UI_GAME_IDS = new Set([11456, 11454, 11453, 19512]);

function stripHiddenSportsUiGames(games = [], category) {
  const normalized = normalizeCategoryForApi(category || '');
  if (normalized !== 'sports') return games;
  return games.filter((game) => {
    const title = String(game.title || game.name || '').trim();
    const gameId = Number(game.gameId);
    if (HIDDEN_SPORTS_UI_TITLES.has(title)) return false;
    if (gameId && HIDDEN_SPORTS_UI_GAME_IDS.has(gameId)) return false;
    return true;
  });
}

function filterStaticGames({ category, provider, gameTitle }) {
  if (gameTitle) {
    return gamesCatalog.filter((game) => game.title === gameTitle);
  }

  if (!category && !provider) {
    return gamesCatalog;
  }

  return gamesCatalog.filter((game) => {
    const categoryMatch = category ? game.category === category : true;
    const providerMatch = provider
      ? game.provider.toLowerCase() === provider.toLowerCase()
      : true;

    return categoryMatch && providerMatch;
  });
}

function mapApiCategory(category, provider) {
  if (!category && provider) return 'all';
  if (!category) return 'hot';
  const normalized = normalizeCategoryForApi(category);
  if (normalized === 'hot') return 'hot';
  if (normalized === 'featured') return 'featured';
  if (normalized === 'live') return 'live';
  return normalized;
}

import { resolveProviderLogo } from '../utils/providerLogo';

async function fetchCategoryGames(category) {
  const primary = normalizeCategoryForApi(category);
  let result = await fetchSiteGames({ category: primary, limit: 200 });
  let games = result.data || [];

  if (!games.length && primary === 'slots') {
    result = await fetchSiteGames({ category: 'slot', limit: 200 });
    games = result.data || [];
  }

  return { games, gatewayDisabled: result.gamesEnabled === false || result.gatewayActive === false };
}

function buildProvidersFromGames(games, allProviders) {
  const logoByCode = new Map();
  const logoByName = new Map();

  for (const provider of allProviders) {
    if (provider.code) logoByCode.set(String(provider.code).toUpperCase(), provider);
    if (provider.name) logoByName.set(String(provider.name).toLowerCase(), provider);
  }

  const seen = new Set();
  const merged = [];

  for (const provider of allProviders) {
    const codeKey = String(provider.code || '').toUpperCase();
    const nameKey = String(provider.name || '').toLowerCase();
    const hasGame = games.some((game) => {
      const gameCode = String(game.providerCode || '').toUpperCase();
      const gameName = String(game.provider || '').toLowerCase();
      return (codeKey && gameCode === codeKey) || (nameKey && gameName === nameKey);
    });

    if (!hasGame || seen.has(codeKey || nameKey)) continue;
    seen.add(codeKey || nameKey);
    merged.push({
      id: provider.code || provider.id || provider.name,
      code: provider.code || provider.name,
      name: provider.name,
      logo: resolveProviderLogo(provider),
    });
  }

  for (const game of games) {
    const code = String(game.providerCode || '').trim();
    const name = String(game.provider || '').trim();
    const key = (code || name).toUpperCase();
    if (!key || seen.has(key)) continue;

    const matched = (code && logoByCode.get(code.toUpperCase()))
      || (name && logoByName.get(name.toLowerCase()));

    seen.add(key);
    merged.push({
      id: matched?.code || code || name,
      code: matched?.code || code || name,
      name: matched?.name || name || code,
      logo: resolveProviderLogo({
        code: matched?.code || code,
        name: matched?.name || name,
        logo: matched?.logo || game.image || game.imageUrl,
      }),
    });
  }

  return merged.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProvidersByCategory(category) {
  if (!category) return [];

  const apiCategory = normalizeCategoryForApi(category);
  const cacheKey = `providers:${apiCategory}`;
  const cached = getCachedProviders(cacheKey);
  if (cached) return cached;

  try {
    const providersResult = await fetchSiteProviders({ category: apiCategory });
    const providers = providersResult.data || [];
    if (providers.length) {
      setCachedProviders(cacheKey, providers);
      return providers;
    }

    const [providersResultLegacy, categoryGames] = await Promise.all([
      fetchSiteProviders(),
      fetchCategoryGames(category),
    ]);

    if (!categoryGames.gatewayDisabled) {
      const allProviders = providersResultLegacy.data || [];
      const derivedProviders = buildProvidersFromGames(categoryGames.games, allProviders);
      if (derivedProviders.length) {
        setCachedProviders(cacheKey, derivedProviders);
        return derivedProviders;
      }
    }
  } catch {
    // fall back to static menu providers
  }

  const categoryKey = resolveCategoryKey(apiCategory);
  const fallback = (menuProviders[categoryKey] || []).map((provider) => ({
    id: provider.filterProvider || provider.name,
    code: provider.filterProvider || provider.name,
    name: provider.name,
    logo: resolveProviderLogo({
      code: provider.filterProvider || provider.name,
      name: provider.name,
      logo: provider.logo || provider.icon,
    }),
  }));

  setCachedProviders(cacheKey, fallback);
  return fallback;
}

export async function getGamesByFilter({ category, provider, gameTitle } = {}) {
  try {
    if (!gameTitle && !provider && (category === 'hot' || !category)) {
      // HOT_GAMES_DISPLAY_FIX: always render admin hot list; gateway only affects play
      const hotResult = await fetchHotGamesCached(HOME_HOT_GAMES_LIMIT);
      const hotGames = hotResult.data || [];
      if (hotGames.length) return hotGames;
    }

    const apiCategory = mapApiCategory(category, provider);
    const result = await fetchSiteGames({
      category: gameTitle ? 'all' : apiCategory,
      provider: provider || '',
      limit: 200,
    });

    if (result.gamesEnabled === false || result.gatewayActive === false) {
      return [];
    }

    let games = result.data || [];

    if (gameTitle) {
      games = games.filter((game) => game.title === gameTitle || game.name === gameTitle);
    }

    if (games.length) return stripHiddenSportsUiGames(games, category);
  } catch {
    // fall back to static catalog only when API fails unexpectedly
  }

  return stripHiddenSportsUiGames(
    filterStaticGames({ category, provider, gameTitle }),
    category,
  );
}

export { CATEGORY_KEY_MAP };
