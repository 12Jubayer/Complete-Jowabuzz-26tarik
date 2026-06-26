import { useEffect, useState } from 'react';
import ProfilePageShell, { EmptyCard } from '../../components/profile/ProfilePageShell';
import { fetchBettingRecords } from '../../services/userProfileService';

export default function ProfileBettingRecordPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBettingRecords()
      .then((data) => setRecords(data.records || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProfilePageShell title="Betting record">
      {loading ? (
        <EmptyCard message="Loading..." />
      ) : records.length === 0 ? (
        <EmptyCard message="No betting records yet" />
      ) : (
        <div className="space-y-3">
          {records.map((row) => (
            <div key={row.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">{row.gameName}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(row.createdAt).toLocaleString()}</p>
                </div>
                <p className={`font-bold ${row.profitLoss >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  ৳{Number(row.profitLoss).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ProfilePageShell>
  );
}
