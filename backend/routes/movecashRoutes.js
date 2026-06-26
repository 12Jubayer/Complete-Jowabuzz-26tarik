import express from 'express';
import { getMoveCashDownloadPage } from '../controllers/movecashController.js';

const router = express.Router();

router.get('/download/:token', getMoveCashDownloadPage);

export default router;
