export async function fetchSitePopupBanners() {
  const response = await fetch('/api/site/popup-banners', {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to load popup banners');
  }

  return response.json();
}

export default fetchSitePopupBanners;
