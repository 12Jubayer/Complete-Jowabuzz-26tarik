import { useEffect, useState } from 'react';

import ProfilePageShell, { EmptyCard } from '../../components/profile/ProfilePageShell';

import { fetchUserBonus, fetchUserBonusStatus } from '../../services/userProfileService';



function bonusStatusClass(status) {
  if (status === 'completed' || status === 'claimed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'expired' || status === 'cancelled') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
}

function bonusStatusLabel(status) {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'completed') return 'Completed';
  if (status === 'claimed') return 'Claimed';
  if (status === 'expired') return 'Expired';
  if (status === 'cancelled') return 'Cancelled';
  return status;
}

function progressBarClass(status) {
  if (status === 'completed' || status === 'claimed') return 'bg-emerald-500';
  if (status === 'expired' || status === 'cancelled') return 'bg-red-400';
  return 'bg-amber-500';
}

export default function ProfileBonusPage() {

  const [data, setData] = useState(null);
  const [bonusStatus, setBonusStatus] = useState(null);

  useEffect(() => {

    Promise.all([fetchUserBonus(), fetchUserBonusStatus()])
      .then(([bonusData, statusData]) => {
        setData(bonusData);
        setBonusStatus(statusData);
      })
      .catch(() => {});

  }, []);



  return (

    <ProfilePageShell title="Bonus">

      <div className="mb-4 rounded-2xl bg-violet-50 p-4">

        <p className="text-sm text-violet-700">Total bonus earned</p>

        <p className="text-2xl font-bold text-violet-800">৳{Number(data?.totalBonus || 0).toFixed(2)}</p>

      </div>



      {bonusStatus?.inProgressAccounts?.length ? (
        <div className="mb-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Deposit balance bonus progress</h3>
          {bonusStatus.inProgressAccounts.map((account) => (
            <div key={account.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">{account.ruleTitle}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Bonus {account.bonusPercent}% · ৳{Number(account.bonusAmount).toFixed(2)} · Deposit ৳
                    {Number(account.depositAmount).toFixed(2)} · Turnover {account.turnoverMultiplier}x
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  In Progress
                </span>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Turnover progress</span>
                  <span>
                    ৳{Number(account.completedTurnover).toFixed(2)} / ৳
                    {Number(account.requiredTurnover).toFixed(2)} (
                    {Number(account.progress ?? account.progressPercent ?? 0).toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${Math.min(100, account.progress ?? account.progressPercent ?? 0)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Remaining ৳{Number(account.remainingTurnover ?? 0).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {data?.turnoverClaims?.length ? (

        <div className="mb-4 space-y-3">

          <h3 className="text-sm font-semibold text-slate-700">Bonus turnover progress</h3>

          {data.turnoverClaims.map((claim) => (

            <div key={claim.id} className="rounded-2xl bg-white p-4 shadow-sm">

              <div className="flex items-start justify-between gap-3">

                <div>

                  <p className="font-semibold text-slate-800">{claim.ruleTitle || 'Deposit Bonus'}</p>

                  <p className="mt-1 text-xs text-slate-500">

                    Bonus {claim.bonusPercent ?? '—'}% · ৳{Number(claim.bonusAmount).toFixed(2)} · Deposit ৳{Number(claim.depositAmount).toFixed(2)}

                  </p>

                </div>

                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${bonusStatusClass(claim.status)}`}>

                  {bonusStatusLabel(claim.status)}

                </span>

              </div>

              <div className="mt-3">

                <div className="mb-1 flex justify-between text-xs text-slate-500">

                  <span>Turnover progress</span>

                  <span>

                    ৳{Number(claim.completedTurnover).toFixed(2)} / ৳{Number(claim.requiredTurnover).toFixed(2)} ({Math.round(claim.progressPercent || 0)}%)

                  </span>

                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                  <div

                    className={`h-full rounded-full ${progressBarClass(claim.status)}`}

                    style={{ width: `${claim.progressPercent || 0}%` }}

                  />

                </div>

                <p className="mt-1 text-xs text-slate-400">

                  Remaining ৳{Number(claim.remainingTurnover ?? Math.max(0, claim.requiredTurnover - claim.completedTurnover)).toFixed(2)}

                </p>

              </div>

            </div>

          ))}

        </div>

      ) : null}



      {!data?.bonuses?.length && !data?.turnoverClaims?.length && !bonusStatus?.inProgressAccounts?.length ? (

        <EmptyCard message="No bonus records yet" />

      ) : data?.bonuses?.length ? (

        <div className="space-y-3">

          {data.bonuses.map((row) => (

            <div key={row.id} className="rounded-2xl bg-white p-4 shadow-sm">

              <div className="flex justify-between gap-3">

                <div>

                  <p className="font-semibold text-slate-800">{row.title}</p>

                  <p className="mt-1 text-xs text-slate-500">{new Date(row.createdAt).toLocaleString()}</p>

                </div>

                <p className="font-bold text-emerald-600">+৳{Number(row.amount).toFixed(2)}</p>

              </div>

            </div>

          ))}

        </div>

      ) : null}

    </ProfilePageShell>

  );

}


