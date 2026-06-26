import {
  listAdminConversations,
  listConversationMessages,
  sendAdminChatReply,
} from '../services/liveChatService.js';
import { emitLiveChatEvents } from '../socket/liveChatSocket.js';

export async function getAdminLiveChatConversations(req, res) {
  try {
    const data = await listAdminConversations({ search: req.query.search });
    return res.json({ data });
  } catch (error) {
    console.error('Get admin live chat conversations error:', error);
    return res.status(500).json({ error: 'Failed to load conversations' });
  }
}

export async function getAdminLiveChatMessages(req, res) {
  try {
    const conversationId = Number(req.params.id);
    const result = await listConversationMessages(conversationId, { markUserMessagesRead: true });
    return res.json(result);
  } catch (error) {
    console.error('Get admin live chat messages error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to load messages',
    });
  }
}

export async function postAdminLiveChatReply(req, res) {
  try {
    const conversationId = Number(req.params.id);
    const result = await sendAdminChatReply({
      conversationId,
      adminId: Number(req.admin?.sub),
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
      message: 'Reply sent',
      data: result.message,
    });
  } catch (error) {
    console.error('Post admin live chat reply error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to send reply',
    });
  }
}

export async function uploadAdminLiveChatAttachment(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    const url = `/uploads/chat/${req.file.filename}`;
    return res.json({
      success: true,
      url,
      attachmentType: req.file.mimetype,
    });
  } catch (error) {
    console.error('Upload admin live chat attachment error:', error);
    return res.status(500).json({ error: 'Upload failed, আবার চেষ্টা করুন' });
  }
}

export default getAdminLiveChatConversations;
