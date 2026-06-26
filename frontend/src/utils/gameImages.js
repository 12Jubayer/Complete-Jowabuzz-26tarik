export function gameSlug(title = '') {
  return String(title)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getGameImage(title) {
  const slug = gameSlug(title);
  return slug ? `/images/games/${slug}.svg` : '/images/games/fortune-gems.svg';
}

export default getGameImage;
