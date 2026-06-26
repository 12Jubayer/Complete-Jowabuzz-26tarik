import { Router } from 'express';
import { optionalUserAuth } from '../middleware/optionalUserAuth.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import {
  deleteAdminChatFaq,
  getAdminChatFaqs,
  getAdminChatSettings,
  getPublicChatFaqs,
  postAdminChatFaq,
  postPublicChatFaqSelect,
  putAdminChatFaq,
  putAdminChatSettings,
} from '../controllers/chatFaqController.js';

const publicRouter = Router();
publicRouter.get('/faqs', getPublicChatFaqs);
publicRouter.post('/faq/select', optionalUserAuth, postPublicChatFaqSelect);

const adminRouter = Router();
adminRouter.use(requireAdminAuth);
adminRouter.get('/chat/faqs', getAdminChatFaqs);
adminRouter.post('/chat/faqs', postAdminChatFaq);
adminRouter.put('/chat/faqs/:id', putAdminChatFaq);
adminRouter.delete('/chat/faqs/:id', deleteAdminChatFaq);
adminRouter.get('/chat/settings', getAdminChatSettings);
adminRouter.put('/chat/settings', putAdminChatSettings);

export { publicRouter as chatFaqPublicRoutes, adminRouter as chatFaqAdminRoutes };
