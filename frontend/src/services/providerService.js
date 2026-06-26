import { normalizeCategoryForApi } from '../utils/categoryNavigation';
import { resolveProviderLogo } from '../utils/providerLogo';
import { getProvidersByCategory as getApiProviders } from './gameService';

function mapProviderForDesktop(provider, category) {
  const filterCategory = normalizeCategoryForApi(category);
  return {
    name: provider.name,
    icon: resolveProviderLogo(provider),
    filterCategory: filterCategory === 'slots' ? 'slots' : category,
    filterProvider: provider.code || provider.name,
  };
}

/**
 * Returns providers for a category from the gaming API (with static fallback).
 */
export async function getProvidersByCategory(category) {
  if (!category) return [];

  const providers = await getApiProviders(category);
  return providers.map((provider) => mapProviderForDesktop(provider, category));
}

export default getProvidersByCategory;
