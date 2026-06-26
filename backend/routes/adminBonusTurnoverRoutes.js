import { Router } from 'express';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

router.use(requireAdminAuth);

router.all('/bonus-turnover', (_req, res) => {
  res.status(404).json({ error: 'Bonus turnover configuration is no longer available' });
});

router.all('/bonus-turnover/:id', (_req, res) => {
  res.status(404).json({ error: 'Bonus turnover configuration is no longer available' });
});

export default router;
