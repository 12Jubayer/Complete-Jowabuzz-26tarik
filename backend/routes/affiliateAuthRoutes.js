import { Router } from 'express';
import { loginAffiliate, registerAffiliate } from '../controllers/affiliateAuthController.js';
import { rateLimit } from '../middleware/affiliateAuth.js';
import { affiliateResponseSanitizer } from '../middleware/affiliateResponseSanitizer.js';

const router = Router();

router.use(affiliateResponseSanitizer);

router.post('/login', rateLimit({ windowMs: 60_000, max: 20, keyPrefix: 'affiliate-login' }), loginAffiliate);
router.post('/register', rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'affiliate-register' }), registerAffiliate);
export default router;
