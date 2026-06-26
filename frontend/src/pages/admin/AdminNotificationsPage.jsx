import { useCallback, useEffect, useState } from 'react';
import { Bell, RefreshCw, Send, Users, UserCog } from 'lucide-react';
import AdminToast from '../../components/admin/AdminToast';
import {
  fetchAdminNotifications,
  sendAdminNotification,
} from '../../services/adminNotificationService';

const MAX_MESSAGE_LENGTH = 2000;

const ROLE_OPTIONS = [
  { value: 'player', label: 'Player' },
  { value: 'agent', label: 'Agent' },
  { value: 'affiliate', label: 'Affiliate' },
  { value: 'admin', label: 'Admin' },
];

function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString();
}

function NotificationTag({ tag }) {
  const isBroadcast = tag === 'Broadcast';
  return (
    <span
      className={[
        'inline-flex rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        isBroadcast ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700',
      ].join(' ')}
    >
      {tag}
    </span>
  );
}

export default function AdminNotificationsPage() {
  const [audienceMode, setAudienceMode] = useState('all');
  const [targetRole, setTargetRole] = useState('player');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recent, setRecent] = useState([]);
  const [audienceCounts, setAudienceCounts] = useState({
    allUsers: 0,
    player: 0,
    affiliate: 0,
    agent: 0,
    admin: 0,
  });
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('error');

  const showToast = useCallback((text, type = 'error') => {
    setToastType(type);
    setToast(text);
    window.setTimeout(() => setToast(''), 3500);
  }, []);

  const loadRecent = useCallback(async (silent = false) => {
    if (!silent) setLoadingRecent(true);
    else setRefreshing(true);

    try {
      const result = await fetchAdminNotifications({ limit: 50 });
      setRecent(result.data || []);
      if (result.audienceCounts) {
        setAudienceCounts(result.audienceCounts);
      }
    } catch (error) {
      showToast(error.message || 'Failed to load notifications');
      setRecent([]);
    } finally {
      setLoadingRecent(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const handleSend = async () => {
    const safeTitle = title.trim();
    const safeMessage = message.trim();

    if (!safeTitle) {
      showToast('Title is required');
      return;
    }
    if (!safeMessage) {
      showToast('Message is required');
      return;
    }
    if (safeMessage.length > MAX_MESSAGE_LENGTH) {
      showToast(`Message must be ${MAX_MESSAGE_LENGTH} characters or less`);
      return;
    }

    setSending(true);
    try {
      const result = await sendAdminNotification({
        title: safeTitle,
        message: safeMessage,
        audienceMode,
        targetRole: audienceMode === 'role' ? targetRole : undefined,
      });
      showToast(result.message || 'Notification sent successfully', 'success');
      setTitle('');
      setMessage('');
      await loadRecent(true);
    } catch (error) {
      showToast(error.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const roleCount = audienceCounts[targetRole] ?? 0;

  return (
    <>
      <AdminToast message={toast} type={toastType} />

      <div className="admin-notifications-page space-y-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Bell className="text-emerald-500" size={22} strokeWidth={2.2} />
            <h2 className="text-[26px] font-bold tracking-tight text-slate-900">Notifications</h2>
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            Send announcements to all users or filter by role. Messages appear in user inbox instantly.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Send New Notification</h3>

            <div className="mt-5 space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Audience</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAudienceMode('all')}
                    disabled={sending}
                    className={[
                      'flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors',
                      audienceMode === 'all'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <Users size={16} />
                    All Users ({audienceCounts.allUsers})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudienceMode('role')}
                    disabled={sending}
                    className={[
                      'flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors',
                      audienceMode === 'role'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <UserCog size={16} />
                    By Role
                  </button>
                </div>
              </div>

              {audienceMode === 'role' && (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Role ({roleCount} users)
                  </span>
                  <select
                    value={targetRole}
                    onChange={(event) => setTargetRole(event.target.value)}
                    disabled={sending}
                    className="admin-notifications-input w-full rounded-xl px-4 py-2.5 text-sm"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Title</span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={sending}
                  maxLength={200}
                  placeholder="e.g. New deposit bonus available!"
                  className="admin-notifications-input w-full rounded-xl px-4 py-2.5 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Message ({message.length}/{MAX_MESSAGE_LENGTH})
                </span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={sending}
                  maxLength={MAX_MESSAGE_LENGTH}
                  rows={6}
                  placeholder="Write your announcement here..."
                  className="admin-notifications-input w-full rounded-xl px-4 py-3 text-sm"
                />
              </label>

              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
              >
                <Send size={16} />
                {sending ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-emerald-500" />
                <h3 className="text-lg font-semibold text-slate-900">Recent Notifications</h3>
              </div>
              <button
                type="button"
                onClick={() => loadRecent(true)}
                disabled={refreshing || loadingRecent}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {loadingRecent ? (
                <div className="py-16 text-center text-sm text-slate-400">Loading notifications...</div>
              ) : recent.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400">No notifications sent yet</div>
              ) : (
                recent.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <NotificationTag tag={item.tag} />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.message}</p>
                    <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
