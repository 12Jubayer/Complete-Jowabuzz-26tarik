import { Router } from 'express';
import {
  getPublicFirstToReach,
  getPublicWinnerBoardLeaderboard,
  getPublicWinnerBoards,
} from '../controllers/winnerBoardController.js';

const router = Router();

router.get('/winner-boards', getPublicWinnerBoards);
router.get('/winner-board/leaderboard', getPublicWinnerBoardLeaderboard);
router.get('/winner-board/first-to-reach', getPublicFirstToReach);

export default router;
