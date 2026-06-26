import { useEffect, useState } from 'react';
import ProfilePageShell, { EmptyCard } from '../../components/profile/ProfilePageShell';
import { fetchUserTransactions } from '../../services/userProfileService';

export default function ProfileTransferRecordPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    fetchUserTransactions('all').then((data) => {
      setRows((data.transactions || []).filter((row) => row.method === 'agent' || row.type === 'adjustment'));
    });
  }, []);

  return (
    <ProfilePageShell title="Transfer record">
      {rows.length === 0 ? (
        <EmptyCard message="No transfer records yet" />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold capitalize text-slate-800">{row.type}</p>
                  <p className="mt-1 text-xs text-slate-500">{row.method || 'transfer'}</p>
                </div>
                <p className="font-bold">৳{Number(row.amount).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ProfilePageShell>
  );
}
