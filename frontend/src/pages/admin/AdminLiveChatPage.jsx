import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { MessageCircle, Paperclip, Search, Send } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import {
  createAdminLiveChatSocketAuth,
  fetchAdminLiveChatConversations,
  fetchAdminLiveChatMessages,
  sendAdminLiveChatReply,
  uploadAdminLiveChatAttachment,
} from '../../services/adminLiveChatService';

function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString();
}

function ChatMessageBubble({ message }) {
  const isAdmin = message.senderType === 'admin';
  const isBot = message.senderType === 'bot';

  return (
    <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm',
          isAdmin
            ? 'rounded-br-md bg-emerald-500 text-white'
            : 'rounded-bl-md border border-slate-200 bg-white text-slate-800',
        ].join(' ')}
      >
        {isBot ? (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            Support Bot
          </p>
        ) : null}
        {message.message ? <p className="whitespace-pre-wrap break-words">{message.message}</p> : null}
        {message.attachmentUrl ? (
          message.attachmentType?.startsWith('image/') ? (
            <a href={message.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1 block">
              <img
                src={message.attachmentUrl}
                alt="Attachment"
                className="max-h-48 rounded-lg object-cover"
              />
            </a>
          ) : (
            <a
              href={message.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className={`mt-1 inline-block underline ${isAdmin ? 'text-emerald-50' : 'text-emerald-600'}`}
            >
              View attachment
            </a>
          )
        ) : null}
        <p className={`mt-1 text-[10px] ${isAdmin ? 'text-emerald-100' : 'text-slate-400'}`}>
          {formatDateTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

export default function AdminLiveChatPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');
  const listRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedIdRef = useRef(null);

  const showToast = useCallback((message, type = 'error') => {
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

  const loadConversations = useCallback(
    async (silent = false) => {
      if (!silent) setLoadingList(true);
      try {
        const result = await fetchAdminLiveChatConversations(search.trim());
        setConversations(result.data || []);
      } catch (error) {
        showToast(error.message || 'Failed to load conversations');
        setConversations([]);
      } finally {
        if (!silent) setLoadingList(false);
      }
    },
    [search, showToast],
  );

  const loadMessages = useCallback(
    async (conversationId) => {
      if (!conversationId) return;
      setLoadingMessages(true);
      try {
        const result = await fetchAdminLiveChatMessages(conversationId);
        setMessages(result.data || []);
        setSelectedConversation(result.conversation || null);
        setConversations((current) =>
          current.map((row) =>
            row.id === conversationId ? { ...row, unreadCount: 0 } : row,
          ),
        );
        scrollToBottom();
      } catch (error) {
        showToast(error.message || 'Failed to load messages');
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    },
    [scrollToBottom, showToast],
  );

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadConversations();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
    } else {
      setMessages([]);
      setSelectedConversation(null);
    }
  }, [selectedId, loadMessages]);

  useEffect(() => {
    const auth = createAdminLiveChatSocketAuth();
    if (!auth.token) return undefined;

    const socket = io({
      path: '/socket.io',
      auth,
      transports: ['websocket', 'polling'],
    });

    socket.on('chat:message', (payload) => {
      if (!payload?.message) return;

      loadConversations(true);

      if (Number(payload.conversationId) === Number(selectedIdRef.current)) {
        setMessages((current) => {
          if (current.some((row) => row.id === payload.message.id)) return current;
          return [...current, payload.message];
        });
        scrollToBottom();
      }
    });

    socket.on('chat:conversation:updated', () => {
      loadConversations(true);
    });

    return () => socket.disconnect();
  }, [loadConversations, scrollToBottom]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!selectedId || !text || sending) return;

    setSending(true);
    try {
      const result = await sendAdminLiveChatReply(selectedId, { message: text });
      setDraft('');
      setMessages((current) => [...current, result.data]);
      loadConversations(true);
      scrollToBottom();
    } catch (error) {
      showToast(error.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedId || uploading) return;

    setUploading(true);
    try {
      const upload = await uploadAdminLiveChatAttachment(file);
      const result = await sendAdminLiveChatReply(selectedId, {
        message: '',
        attachmentUrl: upload.attachmentUrl,
        attachmentType: upload.attachmentType,
      });
      setMessages((current) => [...current, result.data]);
      loadConversations(true);
      scrollToBottom();
      showToast('Attachment sent', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to upload attachment');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const totalUnread = conversations.reduce(
    (sum, row) => sum + Number(row.unreadCount || 0) + (row.needsAttention ? 1 : 0),
    0,
  );

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="admin-live-chat-page space-y-5">
        <div>
          <div className="flex items-center gap-2.5">
            <MessageCircle className="text-emerald-500" size={22} strokeWidth={2.2} />
            <h2 className="text-[26px] font-bold tracking-tight text-slate-900">Live Chat</h2>
            {totalUnread > 0 && (
              <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
                {totalUnread} unread
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            Reply to user messages in real time. Conversations update instantly.
          </p>
        </div>

        <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[320px_1fr]">
          <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-100 p-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search user..."
                  className="admin-live-chat-input w-full rounded-xl py-2.5 pl-9 pr-3 text-sm"
                />
              </div>
            </div>

            <div className="max-h-[540px] overflow-y-auto">
              {loadingList ? (
                <p className="px-4 py-10 text-center text-sm text-slate-400">Loading conversations...</p>
              ) : conversations.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-400">No conversations yet</p>
              ) : (
                conversations.map((row) => {
                  const active = row.id === selectedId;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className={[
                        'flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors',
                        active ? 'bg-emerald-50' : 'hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                        {(row.displayName || 'U').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-semibold text-slate-900">{row.displayName}</p>
                          {row.unreadCount > 0 && (
                            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                              {row.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {row.lastMessage || 'No messages yet'}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {formatDateTime(row.lastMessageAt || row.createdAt)}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex min-h-[620px] flex-col">
            {!selectedId ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                Select a conversation to start chatting
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 px-5 py-4">
                  <p className="font-semibold text-slate-900">
                    {selectedConversation?.displayName || 'Conversation'}
                  </p>
                  {selectedConversation?.userPhone ? (
                    <p className="text-xs text-slate-500">{selectedConversation.userPhone}</p>
                  ) : null}
                </div>

                <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
                  {loadingMessages ? (
                    <p className="py-10 text-center text-sm text-slate-400">Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-400">No messages in this conversation</p>
                  ) : (
                    messages.map((message) => <ChatMessageBubble key={message.id} message={message} />)
                  )}
                </div>

                <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || sending}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                    aria-label="Attach file"
                  >
                    <Paperclip size={18} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain"
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
                    placeholder="Type your reply..."
                    disabled={sending || uploading}
                    className="admin-live-chat-input min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || uploading || !draft.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    <Send size={16} />
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
