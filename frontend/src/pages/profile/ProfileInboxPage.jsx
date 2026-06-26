import { useState } from 'react';
import ProfilePageShell, { EmptyCard } from '../../components/profile/ProfilePageShell';
import { useNotifications } from '../../context/NotificationContext';

function NotificationTag({ tag }) {
  const isBroadcast = tag === 'Broadcast';
  return (
    <span
      className={[
        'inline-flex rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        isBroadcast ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700',
      ].join(' ')}
    >
      {tag}
    </span>
  );
}

export default function ProfileInboxPage() {
  const { notifications, loading, markAsRead } = useNotifications();
  const [openingId, setOpeningId] = useState(null);

  const handleOpen = async (item) => {
    if (item.isRead || openingId) return;

    setOpeningId(item.id);
    try {
      await markAsRead(item.id);
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <ProfilePageShell title="Inbox message">
      {loading ? (
        <EmptyCard message="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <EmptyCard message="No messages yet" />
      ) : (
        <div className="space-y-3">
          {notifications.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => handleOpen(row)}
              disabled={openingId === row.id}
              className={[
                'w-full rounded-2xl bg-white p-4 text-left shadow-sm transition-opacity',
                row.isRead ? 'opacity-80' : 'ring-1 ring-emerald-200',
                openingId === row.id ? 'opacity-60' : '',
              ].join(' ')}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-800">{row.title}</p>
                <NotificationTag tag={row.tag} />
                {!row.isRead && (
                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    New
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-600">{row.message}</p>
              <p className="mt-2 text-xs text-slate-400">
                {new Date(row.createdAt).toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      )}
    </ProfilePageShell>
  );
}
