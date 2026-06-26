const FALLBACK_BOARDS = [
  {
    id: 1,
    slug: 'slots-leaderboard',
    title: 'Slots Leaderboard',
    bannerUrl: null,
    startDate: '2026/02/09',
    endDate: '2026/12/31',
  },
];

const FALLBACK_DAILY = {
  board: FALLBACK_BOARDS[0],
  period: 'daily',
  periodEndsAt: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
  podium: [
    { rank: 1, username: '01***35', gameName: 'Fortune Garuda', gameImage: '/images/games/fortune-gems.svg', amount: 832000, rewardPoints: 3000 },
    { rank: 2, username: 'md***53', gameName: 'Mega Ace', gameImage: '/images/games/mega-ace.svg', amount: 680900, rewardPoints: 2000 },
    { rank: 3, username: '17***19', gameName: 'Piggy Bank', gameImage: '/images/games/sweet-bonanza.svg', amount: 610055, rewardPoints: 1500 },
  ],
  entries: [
    { rank: 14, username: 'an***47', gameName: 'Super Ace', gameImage: '/images/games/super-ace.svg', amount: 129820, rewardPoints: 400 },
    { rank: 15, username: 're***78', gameName: 'Fortune Gems 3', gameImage: '/images/games/fortune-gems.svg', amount: 118500, rewardPoints: 350 },
    { rank: 16, username: 'ka***91', gameName: 'Go Rush', gameImage: '/images/games/go-rush.svg', amount: 105200, rewardPoints: 300 },
  ],
};

async function parseError(response) {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || `Request failed (${response.status})`);
}

export async function fetchWinnerBoards() {
  try {
    const response = await fetch('/api/winner-boards');
    if (!response.ok) await parseError(response);
    const result = await response.json();
    const rows = Array.isArray(result.data) ? result.data : [];
    return rows.length ? rows : FALLBACK_BOARDS;
  } catch {
    return FALLBACK_BOARDS;
  }
}

export async function fetchWinnerBoardLeaderboard({ boardId, period = 'daily' }) {
  try {
    const params = new URLSearchParams({ period });
    if (boardId) params.set('boardId', String(boardId));
    const response = await fetch(`/api/winner-board/leaderboard?${params.toString()}`);
    if (!response.ok) await parseError(response);
    const result = await response.json();
    return result.data || FALLBACK_DAILY;
  } catch {
    return {
      ...FALLBACK_DAILY,
      period,
    };
  }
}

export async function fetchFirstToReach({ boardId }) {
  try {
    const params = new URLSearchParams();
    if (boardId) params.set('boardId', String(boardId));
    const response = await fetch(`/api/winner-board/first-to-reach?${params.toString()}`);
    if (!response.ok) await parseError(response);
    const result = await response.json();
    return Array.isArray(result.data) ? result.data : [];
  } catch {
    return [];
  }
}

export function formatWinnerAmount(value) {
  return `৳ ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default {
  fetchWinnerBoards,
  fetchWinnerBoardLeaderboard,
  fetchFirstToReach,
  formatWinnerAmount,
};
