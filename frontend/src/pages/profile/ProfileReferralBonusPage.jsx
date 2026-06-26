import { useEffect, useState } from 'react';
import ProfilePageShell, { EmptyCard } from '../../components/profile/ProfilePageShell';
import { fetchReferralInfo } from '../../services/userProfileService';

export default function ProfileReferralBonusPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchReferralInfo().then(setData).catch(() => {});
  }, []);

  return (
    <ProfilePageShell title="Referral Bonus">
      <div className="mb-4 rounded-2xl bg-emerald-50 p-4">
        <p className="text-sm text-emerald-700">Total referral bonus</p>
        <p className="text-2xl font-bold text-emerald-800">৳{Number(data?.totalBonus || 0).toFixed(2)}</p>
      </div>
      {!data?.referrals?.length ? (
        <EmptyCard message="No referral bonus history yet" />
      ) : (
        <div className="space-y-3">
          {data.referrals.map((row) => (
            <div key={row.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">{row.referredName}</p>
                  <p className="mt-1 text-xs capitalize text-slate-500">{row.status}</p>
                </div>
                <p className="font-bold text-emerald-600">৳{Number(row.bonusAmount).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ProfilePageShell>
  );
}
