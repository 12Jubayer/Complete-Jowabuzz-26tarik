import { staticFavouriteSlides } from '../data/favouriteSlidesData';

const REFRESH_MS = 60_000;

const SLIDE_IMAGES = staticFavouriteSlides.map((slide) => slide.imageUrl).filter(Boolean);

function mapLiveMatchToSlide(match, index) {
  const teamA = String(match?.team_a || '').trim();
  const teamB = String(match?.team_b || '').trim();
  const title = teamA && teamB ? `${teamA} vs ${teamB}` : teamA || teamB || 'Cricket Match';

  return {
    id: String(match?.match_id || `cricket-live-${index + 1}`),
    title,
    imageUrl: match?.image_url || SLIDE_IMAGES[index % SLIDE_IMAGES.length] || SLIDE_IMAGES[0],
    linkUrl: '/',
    matchTime: match?.match_time || null,
    league: match?.league || null,
    status: match?.status || null,
  };
}

export async function fetchCricketFavouriteMatches() {
  const response = await fetch('/api/sports/cricket/live');
  if (!response.ok) {
    throw new Error('Failed to load cricket live matches');
  }

  const body = await response.json();
  const rawMatches = Array.isArray(body.matches) ? body.matches : [];
  const matches = rawMatches.map(mapLiveMatchToSlide);

  return {
    source: body.source || 'unknown',
    provider: body.provider || null,
    configured: Boolean(body.configured),
    matches,
  };
}

export function getFavouriteFallbackSlides() {
  return staticFavouriteSlides;
}

export { REFRESH_MS };

export default fetchCricketFavouriteMatches;
