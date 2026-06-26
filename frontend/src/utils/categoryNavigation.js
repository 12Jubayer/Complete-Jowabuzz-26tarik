import { categories } from '../data/categories';

export const PROVIDER_FIRST_CATEGORIES = new Set([
  'casino',
  'slot',
  'slots',
  'crash',
]);

export function normalizeCategoryForApi(category) {
  if (!category || category === 'hot') return category || 'hot';
  if (category === 'slot') return 'slots';
  return category;
}

export function isProviderFirstCategory(category) {
  if (!category || category === 'hot') return false;
  return PROVIDER_FIRST_CATEGORIES.has(category)
    || PROVIDER_FIRST_CATEGORIES.has(normalizeCategoryForApi(category));
}

export function shouldShowProviderList({ category, provider, gameTitle }) {
  if (!isProviderFirstCategory(category)) return false;
  return !provider && !gameTitle;
}

export function getCategoryLabel(categoryId) {
  const normalized = categoryId === 'slots' ? 'slot' : categoryId;
  const match = categories.find((item) => item.id === normalized);
  return match?.labelBn || match?.label || categoryId || 'Games';
}
