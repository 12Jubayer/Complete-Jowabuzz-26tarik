import { categories } from './categories';

export const mobileIconCategories = categories;

export const mobileTextCategories = categories.map((category) => ({
  id: category.id,
  label: category.id === 'hot' ? 'HOT' : category.label,
}));
