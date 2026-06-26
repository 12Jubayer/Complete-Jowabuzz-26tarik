import { useCallback, useEffect, useState } from 'react';
import ProfilePageShell from '../../components/profile/ProfilePageShell';
import { fetchUserTurnover } from '../../services/userProfileService';

export default function ProfileTurnoverPage() {
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await fetchUserTurnover();
      setData(result);
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    load();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [load]);

  return (
    <ProfilePageShell title="Turnover">
      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-4">
        {[
          ['Deposit', data?.deposit],
          ['Bonus', data?.bonus],
          ['Required turnover', data?.requiredTurnover],
          ['Completed turnover', data?.completedTurnover],
          ['Remaining', data?.remainingTurnover],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="font-semibold text-slate-800">৳{Number(value || 0).toFixed(2)}</span>
          </div>
        ))}
        <div>
          <div className="mb-2 flex justify-between text-xs text-slate-500">
            <span>Progress</span>
            <span>{Math.round(data?.progressPercent || 0)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-violet-600" style={{ width: `${data?.progressPercent || 0}%` }} />
          </div>
        </div>
      </div>
    </ProfilePageShell>
  );
}
