import { useEffect, useState } from 'react';
import ProfilePageShell, { EmptyCard } from '../../components/profile/ProfilePageShell';
import { fetchUserTransactions } from '../../services/userProfileService';

export default function ProfileTransactionsPage() {
  const [tab, setTab] = useState('all');
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetchUserTransactions(tab).then((data) => setRows(data.transactions || []));
  }, [tab]);

  return (
    <ProfilePageShell title="Transaction records">
      <div className="mb-4 flex gap-2">
        {['all', 'deposit', 'withdraw'].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
              tab === item ? 'bg-violet-600 text-white' : 'bg-white text-slate-600'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyCard message="No transactions yet" />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold capitalize text-slate-800">{row.type}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(row.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">৳{Number(row.amount).toFixed(2)}</p>
                  <p className="mt-1 text-xs capitalize text-violet-600">{row.status}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ProfilePageShell>
  );
}
