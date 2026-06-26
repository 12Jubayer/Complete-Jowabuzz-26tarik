export async function fetchPublicFavouriteSliders() {
  const response = await fetch('/api/public/favourite-sliders');
  if (!response.ok) {
    throw new Error('Failed to load favourite sliders');
  }

  const body = await response.json();
  return Array.isArray(body.data) ? body.data : [];
}

export default fetchPublicFavouriteSliders;
