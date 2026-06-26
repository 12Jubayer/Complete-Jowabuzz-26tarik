function normalizePromotionsResponse(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

export async function getPromotions() {
  const response = await fetch('/api/site/promotions', {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const fallback = await fetch('/api/promotions', {
      headers: { Accept: 'application/json' },
    });
    if (!fallback.ok) {
      throw new Error('Failed to load promotions');
    }
    const fallbackBody = await fallback.json();
    return normalizePromotionsResponse(fallbackBody);
  }

  const body = await response.json();
  return normalizePromotionsResponse(body);
}

export default getPromotions;
