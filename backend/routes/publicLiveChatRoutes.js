import { Router } from 'express';
import {
  getSiteLiveChatMessages,
  patchLiveChatMessageRead,
  postSiteLiveChatMessage,
  uploadLiveChatAttachment,
} from '../controllers/siteLiveChatController.js';
import { chatAttachmentUpload } from '../middleware/chatAttachmentUpload.js';
import { chatMessageRateLimit } from '../middleware/chatRateLimit.js';
import { flexChatAuth } from '../middleware/flexChatAuth.js';
import { optionalUserAuth } from '../middleware/optionalUserAuth.js';

const router = Router();

function handleUpload(req, res, next) {
  chatAttachmentUpload.single('file')(req, res, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: 'File too large' });
      }
      if (error.message === 'Unsupported file type') {
        return res.status(400).json({ success: false, error: 'Unsupported file type' });
      }
      return res.status(400).json({ success: false, error: error.message || 'Unsupported file type' });
    }
    return next();
  });
}

function requireChatUploadAuth(req, res, next) {
  const userId = req.user?.sub ? Number(req.user.sub) : null;
  const guestId = req.guestId || null;

  if (!userId && !guestId) {
    return res.status(401).json({
      success: false,
      error: 'Please login again to upload images',
      code: 'NO_AUTH',
    });
  }

  return next();
}

router.get('/site/live-chat/messages', optionalUserAuth, getSiteLiveChatMessages);
router.post('/site/live-chat/messages', optionalUserAuth, chatMessageRateLimit, postSiteLiveChatMessage);
router.post(
  '/live-chat/upload',
  optionalUserAuth,
  chatMessageRateLimit,
  requireChatUploadAuth,
  handleUpload,
  uploadLiveChatAttachment,
);
router.patch('/live-chat/messages/:id/read', flexChatAuth, patchLiveChatMessageRead);

export default router;
