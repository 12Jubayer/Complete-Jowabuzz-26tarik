import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { HelpCircle, Loader2, MessageCircle, Paperclip, Send, X } from 'lucide-react';
import AuthToast from './AuthToast';
import { useAuth } from '../context/AuthContext';
import {
  createLiveChatSocket,
  extractSentMessage,
  fetchSiteLiveChatMessages,
  sendSiteLiveChatMessage,
  uploadLiveChatAttachment,
} from '../services/liveChatService';
import { fetchChatFaqs, selectChatFaq } from '../services/chatFaqService';
import { fetchPublicChatSettings } from '../services/adminGeneralSettingsService';

function MessageBubble({ message }) {
  const isUser = message.senderType === 'user';
  const isBot = message.senderType === 'bot';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm',
          isUser
            ? 'rounded-br-md bg-emerald-500 text-white'
            : 'rounded-bl-md border border-slate-200 bg-white text-slate-800',
        ].join(' ')}
      >
        {isBot ? (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            Support
          </p>
        ) : null}
        {message.message ? <p className="whitespace-pre-wrap break-words">{message.message}</p> : null}
        {message.attachmentUrl ? (
          message.attachmentType?.startsWith('image/') ? (
            <a href={message.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1 block">
              <img
                src={message.attachmentUrl}
                alt="Attachment"
                className="max-h-40 rounded-lg object-cover"
              />
            </a>
          ) : (
            <a
              href={message.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className={`mt-1 inline-block underline ${isUser ? 'text-emerald-50' : 'text-emerald-600'}`}
            >
              View attachment
            </a>
          )
        ) : null}
      </div>
    </div>
  );
}

function appendUniqueMessages(current, incoming = []) {
  const next = (current || []).filter(Boolean);
  incoming.filter(Boolean).forEach((message) => {
    const messageId = message?.id;
    if (messageId == null) return;
    if (next.some((row) => row?.id === messageId)) return;
    next.push(message);
  });
  return next;
}

export default function LiveChatWidget() {
  const { loggedIn } = useAuth();
  const [chatEnabled, setChatEnabled] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [faqsLoading, setFaqsLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [faqSendingId, setFaqSendingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');
  const socketRef = useRef(null);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToastType(type);
    setToast(message);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const scrollToBottom = useCallback(() => {
    window.requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  }, []);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchSiteLiveChatMessages();
      setMessages(result.data || []);
      scrollToBottom();
    } catch (err) {
      setError(err.message || 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  }, [scrollToBottom]);

  const loadFaqs = useCallback(async () => {
    setFaqsLoading(true);
    try {
      const list = await fetchChatFaqs();
      setFaqs(list);
    } catch {
      setFaqs([]);
    } finally {
      setFaqsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicChatSettings()
      .then((result) => setChatEnabled(result.enabled !== false))
      .catch(() => setChatEnabled(true))
      .finally(() => setSettingsLoaded(true));
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    loadMessages();
    loadFaqs();

    const auth = createLiveChatSocket();
    const socket = io({
      path: '/socket.io',
      auth,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('chat:join');
    });

    socket.on('chat:message', (payload) => {
      if (!payload?.message) return;
      setMessages((current) => appendUniqueMessages(current, [payload.message]));
      scrollToBottom();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [open, loggedIn, loadMessages, loadFaqs, scrollToBottom]);

  const handleFaqSelect = async (faq) => {
    if (!faq?.id || faqSendingId) return;
    setFaqSendingId(faq.id);
    setError('');
    try {
      const result = await selectChatFaq(faq.id);
      const incoming = (result.messages || [result.userMessage, result.botMessage]).filter(
        (row) => row && row.id != null,
      );
      setMessages((current) => appendUniqueMessages(current, incoming));
      scrollToBottom();
    } catch (err) {
      setError(err.message || 'Failed to load FAQ answer');
      showToast(err.message || 'Failed to load FAQ answer', 'error');
    } finally {
      setFaqSendingId(null);
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending || uploading) return;

    setSending(true);
    setError('');
    try {
      const result = await sendSiteLiveChatMessage({ message: text });
      const incoming = (result.messages || [result.message, result.botMessage]).filter(
        (row) => row && row.id != null,
      );
      const normalized = incoming.length
        ? incoming
        : [extractSentMessage(result)].filter((row) => row && row.id != null);
      setDraft('');
      setMessages((current) => appendUniqueMessages(current, normalized));
      socketRef.current?.emit('chat:join');
      scrollToBottom();
    } catch (err) {
      setError(err.message || 'Failed to send message');
      showToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleAttachmentClick = () => {
    if (uploading || sending) return;
    fileInputRef.current?.click();
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || uploading) return;

    setUploading(true);
    setError('');
    try {
      const upload = await uploadLiveChatAttachment(file);
      const result = await sendSiteLiveChatMessage({
        message: '',
        attachmentUrl: upload.url,
        attachmentType: upload.attachmentType,
      });
      const incoming = (result.messages || [extractSentMessage(result)]).filter(
        (row) => row && row.id != null,
      );
      setMessages((current) => appendUniqueMessages(current, incoming));
      socketRef.current?.emit('chat:join');
      scrollToBottom();
      showToast('Image sent successfully', 'success');
    } catch (err) {
      const message = err.message || 'Upload failed, আবার চেষ্টা করুন';
      setError(message);
      showToast(message, 'error');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  if (settingsLoaded && !chatEnabled) {
    return null;
  }

  return (
    <>
      <AuthToast message={toast} type={toastType} />

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Live Support"
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.45)] transition-transform hover:scale-105 md:bottom-8 md:right-8"
        >
          <MessageCircle size={26} strokeWidth={2.2} />
        </button>
      )}

      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex w-[min(100vw-32px,380px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:bottom-8 md:right-8">
          <div className="flex items-center justify-between bg-emerald-500 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} />
              <span className="font-semibold">Live Support</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-md p-1 hover:bg-white/15"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={listRef} className="h-[300px] space-y-3 overflow-y-auto bg-slate-50 px-3 py-4">
            {loading ? (
              <p className="py-8 text-center text-sm text-slate-400">Loading chat...</p>
            ) : messages.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                Choose a quick question below or type your message.
              </p>
            ) : (
              messages
                .filter(Boolean)
                .map((message) => <MessageBubble key={message.id} message={message} />)
            )}
          </div>

          <div className="border-t border-slate-200 bg-white px-3 py-2">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <HelpCircle size={12} />
              Quick questions
            </div>
            {faqsLoading ? (
              <p className="pb-2 text-xs text-slate-400">Loading FAQs...</p>
            ) : faqs.length === 0 ? null : (
              <div className="mb-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                {faqs.map((faq) => (
                  <button
                    key={faq.id}
                    type="button"
                    disabled={Boolean(faqSendingId)}
                    onClick={() => handleFaqSelect(faq)}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-left text-[11px] font-medium leading-snug text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    {faq.question}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error ? <p className="px-3 pb-1 text-xs text-red-500">{error}</p> : null}

          <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-3">
            <button
              type="button"
              onClick={handleAttachmentClick}
              disabled={uploading || sending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              aria-label="Attach image"
            >
              {uploading ? (
                <Loader2 size={18} className="animate-spin text-emerald-500" />
              ) : (
                <Paperclip size={18} />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
              onChange={handleUpload}
            />
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your question..."
              disabled={sending || uploading}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || uploading || !draft.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
              aria-label="Send message"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
