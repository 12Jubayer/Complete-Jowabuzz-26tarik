import {
  getUserChatMessages,
  markChatMessageRead,
  sendUserChatMessage,
} from '../services/liveChatService.js';
import { emitLiveChatEvents } from '../socket/liveChatSocket.js';

function getIdentity(req) {
  const userId = req.user?.sub ? Number(req.user.sub) : null;
  if (userId) {
    return { userId, guestId: null };
  }
  return {
    userId: null,
    guestId: req.guestId || null,
  };
}

export async function getSiteLiveChatMessages(req, res) {
  try {
    const { userId, guestId } = getIdentity(req);

    if (!userId && !guestId) {
      return res.status(400).json({ success: false, error: 'Guest id is required' });
    }

    const result = await getUserChatMessages({
      userId,
      guestId,
      markAdminMessagesRead: true,
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Get site live chat messages error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load chat messages' });
  }
}

export async function postSiteLiveChatMessage(req, res) {
  try {
    const { userId, guestId } = getIdentity(req);

    if (!userId && !guestId) {
      return res.status(401).json({
        success: false,
        error: 'Please login again to send messages',
      });
    }

    const result = await sendUserChatMessage({
      userId,
      guestId,
      message: req.body.message,
      attachmentUrl: req.body.attachmentUrl || req.body.attachment_url || null,
      attachmentType: req.body.attachmentType || req.body.attachment_type || null,
    });

    emitLiveChatEvents({
      type: 'message',
      conversationId: result.conversationId,
      message: result.message,
    });

    return res.status(201).json({
      success: true,
      message: result.message,
      conversationId: result.conversationId,
    });
  } catch (error) {
    console.error('Post site live chat message error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to send message',
    });
  }
}

export async function patchLiveChatMessageRead(req, res) {
  try {
    const { userId, guestId } = getIdentity(req);
    const adminId = req.admin?.sub ? Number(req.admin.sub) : null;

    if (!adminId && !userId && !guestId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    await markChatMessageRead(Number(req.params.id), { userId, guestId, adminId });
    return res.json({ success: true });
  } catch (error) {
    console.error('Patch live chat message read error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update message',
    });
  }
}

export async function uploadLiveChatAttachment(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Unsupported file type' });
    }

    const url = `/uploads/chat/${req.file.filename}`;
    return res.json({
      success: true,
      url,
      attachmentType: req.file.mimetype,
    });
  } catch (error) {
    console.error('Upload live chat attachment error:', error);
    return res.status(500).json({ success: false, error: 'Upload failed, আবার চেষ্টা করুন' });
  }
}

export default getSiteLiveChatMessages;
