import {
  createFaq,
  deleteFaq,
  getChatSettings,
  getFaqById,
  listActiveFaqs,
  listAllFaqs,
  saveChatSettings,
  sendFaqExchange,
  sendUserMessageWithFallback,
  updateFaq,
} from '../services/chatFaqService.js';
import { emitLiveChatEvents } from '../socket/liveChatSocket.js';

function getUserIdentity(req) {
  const userId = req.user?.sub ? Number(req.user.sub) : null;
  if (userId) return { userId, guestId: null };
  return { userId: null, guestId: req.guestId || null };
}

function emitMessages(conversationId, messages = []) {
  messages.forEach((message) => {
    emitLiveChatEvents({ type: 'message', conversationId, message });
  });
}

export async function getPublicChatFaqs(req, res) {
  try {
    const faqs = await listActiveFaqs();
    return res.json({ success: true, faqs });
  } catch (error) {
    console.error('Get public chat faqs error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load FAQs' });
  }
}

export async function postPublicChatFaqSelect(req, res) {
  try {
    const { userId, guestId } = getUserIdentity(req);
    if (!userId && !guestId) {
      return res.status(400).json({ success: false, error: 'Guest id is required' });
    }

    const faqId = Number(req.body.faqId ?? req.body.faq_id);
    if (!faqId) {
      return res.status(400).json({ success: false, error: 'FAQ id is required' });
    }

    const result = await sendFaqExchange({ userId, guestId, faqId });
    emitMessages(result.conversationId, result.messages);
    emitLiveChatEvents({
      type: 'conversation',
      conversationId: result.conversationId,
    });

    return res.status(201).json({
      success: true,
      conversationId: result.conversationId,
      messages: result.messages,
      userMessage: result.userMessage,
      botMessage: result.botMessage,
    });
  } catch (error) {
    console.error('Post public chat faq select error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to send FAQ reply',
    });
  }
}

export async function getAdminChatFaqs(req, res) {
  try {
    const faqs = await listAllFaqs();
    return res.json({ success: true, faqs });
  } catch (error) {
    console.error('Get admin chat faqs error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load FAQs' });
  }
}

export async function postAdminChatFaq(req, res) {
  try {
    const faq = await createFaq(req.body || {});
    return res.status(201).json({ success: true, faq, message: 'FAQ created' });
  } catch (error) {
    console.error('Create admin chat faq error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create FAQ',
    });
  }
}

export async function putAdminChatFaq(req, res) {
  try {
    const faq = await updateFaq(Number(req.params.id), req.body || {});
    return res.json({ success: true, faq, message: 'FAQ updated' });
  } catch (error) {
    console.error('Update admin chat faq error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update FAQ',
    });
  }
}

export async function deleteAdminChatFaq(req, res) {
  try {
    await deleteFaq(Number(req.params.id));
    return res.json({ success: true, message: 'FAQ deleted' });
  } catch (error) {
    console.error('Delete admin chat faq error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to delete FAQ',
    });
  }
}

export async function getAdminChatSettings(req, res) {
  try {
    const settings = await getChatSettings();
    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Get admin chat settings error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load chat settings' });
  }
}

export async function putAdminChatSettings(req, res) {
  try {
    const settings = await saveChatSettings(req.body || {});
    return res.json({ success: true, settings, message: 'Chat settings saved' });
  } catch (error) {
    console.error('Save admin chat settings error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to save chat settings',
    });
  }
}

export async function getAdminChatFaqById(req, res) {
  try {
    const faq = await getFaqById(Number(req.params.id));
    if (!faq) return res.status(404).json({ success: false, error: 'FAQ not found' });
    return res.json({ success: true, faq });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to load FAQ' });
  }
}

export { sendUserMessageWithFallback };
