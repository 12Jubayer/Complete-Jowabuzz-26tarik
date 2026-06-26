import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_BOARD = {
  slug: 'slots-leaderboard',
  title: 'Slots Leaderboard',
  bannerUrl: null,
  startDate: '2026-02-09',
  endDate: '2026-12-31',
};

const DAILY_ENTRIES = [
  { rank: 1, username: '01***35', game: 'Fortune Garuda', image: '/images/games/fortune-gems.svg', amount: 832000, reward: 3000 },
  { rank: 2, username: 'md***53', game: 'Mega Ace', image: '/images/games/mega-ace.svg', amount: 680900, reward: 2000 },
  { rank: 3, username: '17***19', game: 'Piggy Bank', image: '/images/games/sweet-bonanza.svg', amount: 610055, reward: 1500 },
  { rank: 4, username: 'sa***12', game: 'Gates of Olympus', image: '/images/games/gates-of-olympus.svg', amount: 520400, reward: 1200 },
  { rank: 5, username: 'rk***88', game: 'Starlight Princess', image: '/images/games/starlight-princess.svg', amount: 480320, reward: 1000 },
  { rank: 6, username: 'mi***41', game: 'Mahjong Ways', image: '/images/games/mahjong-ways.svg', amount: 410250, reward: 900 },
  { rank: 7, username: 'ar***07', game: 'Super Ace Deluxe', image: '/images/games/super-ace-deluxe.svg', amount: 365800, reward: 800 },
  { rank: 8, username: 'na***66', game: 'Go Rush', image: '/images/games/go-rush.svg', amount: 320100, reward: 700 },
  { rank: 9, username: 'fa***29', game: 'Agent Ace', image: '/images/games/agent-ace.svg', amount: 285600, reward: 650 },
  { rank: 10, username: 'jo***54', game: 'Fortune Gems', image: '/images/games/fortune-gems.svg', amount: 250000, reward: 600 },
  { rank: 11, username: 'bi***18', game: 'Sweet Bonanza', image: '/images/games/sweet-bonanza.svg', amount: 210500, reward: 550 },
  { rank: 12, username: 'ta***73', game: 'Mahjong Ways 2', image: '/images/games/mahjong-ways-2.svg', amount: 180400, reward: 500 },
  { rank: 13, username: 'ha***02', game: 'Mega Ace', image: '/images/games/mega-ace.svg', amount: 155300, reward: 450 },
  { rank: 14, username: 'an***47', game: 'Super Ace', image: '/images/games/super-ace.svg', amount: 129820, reward: 400 },
  { rank: 15, username: 're***78', game: 'Fortune Gems 3', image: '/images/games/fortune-gems.svg', amount: 118500, reward: 350 },
  { rank: 16, username: 'ka***91', game: 'Go Rush', image: '/images/games/go-rush.svg', amount: 105200, reward: 300 },
];

function splitSqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

function getPeriodEnd(period) {
  const now = new Date();
  if (period === 'weekly') {
    const end = new Date(now);
    const day = end.getDay();
    const daysUntilSunday = day === 0 ? 0 : 7 - day;
    end.setDate(end.getDate() + daysUntilSunday);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end;
}

function mapBoardRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    bannerUrl: row.banner_url,
    startDate: formatDate(row.start_date),
    endDate: formatDate(row.end_date),
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order || 0),
  };
}

function mapEntryRow(row) {
  return {
    id: row.id,
    rank: Number(row.rank_position),
    username: row.username_mask,
    gameName: row.game_name,
    gameImage: row.game_image || '/images/game-placeholder.svg',
    amount: Number(row.win_amount),
    rewardPoints: Number(row.reward_points),
  };
}

function mapFirstToReachRow(row) {
  return {
    id: row.id,
    title: row.title,
    targetAmount: Number(row.target_amount),
    username: row.username_mask,
    gameName: row.game_name,
    gameImage: row.game_image,
    reachedAt: row.reached_at,
  };
}

export async function migrateWinnerBoardSchema() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, '..', 'sql', 'winner_board.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  for (const statement of splitSqlStatements(schema)) {
    await pool.query(statement);
  }

  const [[{ count }]] = await pool.query(`SELECT COUNT(*) AS count FROM winner_boards`);
  if (Number(count) > 0) return;

  const [result] = await pool.query(
    `INSERT INTO winner_boards (slug, title, banner_url, start_date, end_date, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, 1, 0)`,
    [
      DEFAULT_BOARD.slug,
      DEFAULT_BOARD.title,
      DEFAULT_BOARD.bannerUrl,
      DEFAULT_BOARD.startDate,
      DEFAULT_BOARD.endDate,
    ],
  );

  const boardId = result.insertId;

  for (const entry of DAILY_ENTRIES) {
    await pool.query(
      `INSERT INTO winner_board_entries
       (board_id, period, rank_position, username_mask, game_name, game_image, win_amount, reward_points)
       VALUES (?, 'daily', ?, ?, ?, ?, ?, ?)`,
      [boardId, entry.rank, entry.username, entry.game, entry.image, entry.amount, entry.reward],
    );

    const weeklyAmount = Math.round(entry.amount * 1.35);
    const weeklyReward = Math.round(entry.reward * 1.2);
    await pool.query(
      `INSERT INTO winner_board_entries
       (board_id, period, rank_position, username_mask, game_name, game_image, win_amount, reward_points)
       VALUES (?, 'weekly', ?, ?, ?, ?, ?, ?)`,
      [boardId, entry.rank, entry.username, entry.game, entry.image, weeklyAmount, weeklyReward],
    );
  }
}

export async function listActiveWinnerBoards() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, slug, title, banner_url, start_date, end_date, is_active, sort_order
     FROM winner_boards
     WHERE is_active = 1
     ORDER BY sort_order ASC, id ASC`,
  );
  return rows.map(mapBoardRow);
}

export async function getWinnerBoardEntries({ boardId, period = 'daily' }) {
  const pool = getPool();
  const safePeriod = period === 'weekly' ? 'weekly' : 'daily';

  const [[board]] = await pool.query(
    `SELECT id, slug, title, banner_url, start_date, end_date, is_active, sort_order
     FROM winner_boards
     WHERE id = ? AND is_active = 1
     LIMIT 1`,
    [boardId],
  );

  if (!board) {
    const error = new Error('Winner board not found');
    error.statusCode = 404;
    throw error;
  }

  const [entries] = await pool.query(
    `SELECT id, board_id, period, rank_position, username_mask, game_name, game_image, win_amount, reward_points
     FROM winner_board_entries
     WHERE board_id = ? AND period = ?
     ORDER BY rank_position ASC`,
    [boardId, safePeriod],
  );

  const mappedEntries = entries.map(mapEntryRow);
  const podium = mappedEntries.filter((entry) => entry.rank <= 3);
  const list = mappedEntries.filter((entry) => entry.rank > 3);

  return {
    board: mapBoardRow(board),
    period: safePeriod,
    periodEndsAt: getPeriodEnd(safePeriod).toISOString(),
    podium,
    entries: list,
  };
}

export async function listFirstToReachEntries({ boardId }) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, board_id, title, target_amount, username_mask, game_name, game_image, reached_at, sort_order
     FROM first_to_reach_entries
     WHERE board_id = ? AND is_active = 1 AND reached_at IS NOT NULL
     ORDER BY sort_order ASC, id ASC`,
    [boardId],
  );
  return rows.map(mapFirstToReachRow);
}

export default {
  migrateWinnerBoardSchema,
  listActiveWinnerBoards,
  getWinnerBoardEntries,
  listFirstToReachEntries,
};
