async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

function buildQuery(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function fetchSiteHotGames({ page = 1, limit = 48 } = {}) {
  const response = await fetch(
    `/api/public/games/hot${buildQuery({ page, limit })}`,
    { headers: { Accept: 'application/json' } },
  );
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchSiteGames({ category = 'hot', provider = '', search = '', page = 1, limit = 48 } = {}) {
  const response = await fetch(
    `/api/site/games${buildQuery({ category, provider, search, page, limit })}`,
    { headers: { Accept: 'application/json' } },
  );
  if (!response.ok) await parseError(response);
  return response.json();
}

export async function fetchSiteProviders({ category = '' } = {}) {
  const response = await fetch(
    `/api/site/providers${buildQuery({ category })}`,
    {
    headers: { Accept: 'application/json' },
  },
  );
  if (!response.ok) await parseError(response);
  return response.json();
}

export default {
  fetchSiteHotGames,
  fetchSiteGames,
  fetchSiteProviders,
};
