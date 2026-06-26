import {
  getWinnerBoardEntries,
  listActiveWinnerBoards,
  listFirstToReachEntries,
} from '../services/winnerBoardService.js';

export async function getPublicWinnerBoards(req, res) {
  try {
    const boards = await listActiveWinnerBoards();
    return res.json({ data: boards });
  } catch (error) {
    console.error('Get public winner boards error:', error);
    return res.status(500).json({ error: 'Failed to load winner boards' });
  }
}

export async function getPublicWinnerBoardLeaderboard(req, res) {
  try {
    const boardId = Number(req.query.boardId || req.params.boardId);
    const period = req.query.period === 'weekly' ? 'weekly' : 'daily';

    if (!boardId) {
      const boards = await listActiveWinnerBoards();
      if (!boards.length) {
        return res.json({ data: null });
      }
      const data = await getWinnerBoardEntries({ boardId: boards[0].id, period });
      return res.json({ data });
    }

    const data = await getWinnerBoardEntries({ boardId, period });
    return res.json({ data });
  } catch (error) {
    console.error('Get public winner board leaderboard error:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({ error: error.message || 'Failed to load leaderboard' });
  }
}

export async function getPublicFirstToReach(req, res) {
  try {
    const boardId = Number(req.query.boardId);
    if (!boardId) {
      const boards = await listActiveWinnerBoards();
      if (!boards.length) {
        return res.json({ data: [] });
      }
      const data = await listFirstToReachEntries({ boardId: boards[0].id });
      return res.json({ data });
    }

    const data = await listFirstToReachEntries({ boardId });
    return res.json({ data });
  } catch (error) {
    console.error('Get public first to reach error:', error);
    return res.status(500).json({ error: 'Failed to load first to reach records' });
  }
}

export default {
  getPublicWinnerBoards,
  getPublicWinnerBoardLeaderboard,
  getPublicFirstToReach,
};
