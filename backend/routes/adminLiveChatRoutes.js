import { Router } from 'express';
import {
  getAdminLiveChatConversations,
  getAdminLiveChatMessages,
  postAdminLiveChatReply,
  uploadAdminLiveChatAttachment,
} from '../controllers/adminLiveChatController.js';
import { chatAttachmentUpload } from '../middleware/chatAttachmentUpload.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = Router();

function handleUpload(req, res, next) {
  chatAttachmentUpload.single('file')(req, res, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large' });
      }
      if (error.message === 'Unsupported file type') {
        return res.status(400).json({ error: 'Unsupported file type' });
      }
      return res.status(400).json({ error: error.message || 'Unsupported file type' });
    }
    return next();
  });
}

router.use(requireAdminAuth);

router.get('/live-chat/conversations', getAdminLiveChatConversations);
router.get('/live-chat/conversations/:id/messages', getAdminLiveChatMessages);
router.post('/live-chat/conversations/:id/reply', postAdminLiveChatReply);
router.post('/live-chat/upload', handleUpload, uploadAdminLiveChatAttachment);

export default router;
