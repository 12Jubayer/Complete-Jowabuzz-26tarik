const FALLBACK_CRICKET_MATCHES = [
  {
    id: 'fav-mi-rr',
    title: 'Mumbai Indians vs Rajasthan Royals',
    imageUrl: '/images/favourites/mi-vs-rr.png',
    linkUrl: '/',
    matchTime: '2026-05-24T16:00:00+06:00',
  },
  {
    id: 'fav-kkr-dc',
    title: 'Kolkata Knight Riders vs Delhi Capitals',
    imageUrl: '/images/favourites/kkr-vs-dc.png',
    linkUrl: '/',
    matchTime: '2026-05-24T20:00:00+06:00',
  },
  {
    id: 'fav-yorkshire-derbyshire',
    title: 'Yorkshire vs Derbyshire Falcons',
    imageUrl: '/images/favourites/yorkshire-vs-derbyshire.png',
    linkUrl: '/',
    matchTime: '2026-05-24T20:30:00+06:00',
  },
];

function pickString(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function normalizeMatch(raw, index) {
  if (!raw || typeof raw !== 'object') return null;

  const homeTeam = pickString(raw.homeTeam, raw.team1, raw.teamHome, raw.home);
  const awayTeam = pickString(raw.awayTeam, raw.team2, raw.teamAway, raw.away);
  const title =
    pickString(raw.title, raw.name, raw.eventName) ||
    (homeTeam && awayTeam ? `${homeTeam} vs ${awayTeam}` : '');

  const imageUrl = pickString(raw.imageUrl, raw.bannerUrl, raw.image, raw.banner, raw.thumbnail);
  const linkUrl = pickString(raw.linkUrl, raw.url, raw.betUrl, raw.marketUrl, '/');
  const id = pickString(raw.id, raw.matchId, raw.eventId, raw.fixtureId, `cricket-match-${index + 1}`);

  if (!title && !imageUrl) return null;

  return {
    id,
    title: title || 'Cricket Match',
    imageUrl,
    linkUrl,
    matchTime: pickString(raw.matchTime, raw.startTime, raw.startsAt, raw.kickoff) || null,
  };
}

function extractMatchList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.matches)) return payload.matches;
  if (Array.isArray(payload?.events)) return payload.events;
  if (Array.isArray(payload?.data?.matches)) return payload.data.matches;
  return [];
}

export function normalizeCricketFavourites(payload) {
  return extractMatchList(payload)
    .map(normalizeMatch)
    .filter(Boolean)
    .filter((match) => match.imageUrl);
}

async function fetchExternalCricketMatches() {
  const apiUrl = String(process.env.CRICKET_FAVOURITES_API_URL || '').trim();
  if (!apiUrl) return null;

  const headers = {
    Accept: 'application/json',
  };

  const apiKey = String(process.env.CRICKET_API_KEY || '').trim();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(apiUrl, {
    headers,
    signal: AbortSignal.timeout(Number(process.env.CRICKET_API_TIMEOUT_MS || 8000)),
  });

  if (!response.ok) {
    throw new Error(`Cricket API responded with ${response.status}`);
  }

  const payload = await response.json();
  const matches = normalizeCricketFavourites(payload);
  return matches.length ? matches : null;
}

export async function listCricketFavouriteMatches() {
  try {
    const remoteMatches = await fetchExternalCricketMatches();
    if (remoteMatches?.length) {
      return {
        source: 'cricket-api',
        matches: remoteMatches,
      };
    }
  } catch (error) {
    console.warn('Cricket favourites API unavailable, using fallback matches:', error.message);
  }

  return {
    source: 'fallback',
    matches: FALLBACK_CRICKET_MATCHES,
  };
}

export default listCricketFavouriteMatches;
