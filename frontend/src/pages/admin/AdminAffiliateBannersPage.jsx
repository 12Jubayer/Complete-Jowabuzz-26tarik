export default function AdminAffiliateBannersPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-[28px] font-bold tracking-tight text-slate-900">Affiliate Banners</h2>
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          Upload and manage promo banners for affiliates. Affiliates can download banners from their Marketing Tools page.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {['728x90 Leaderboard', '300x250 Medium Rectangle', '160x600 Skyscraper'].map((size) => (
            <div key={size} className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">{size}</p>
              <p className="mt-2 text-xs text-slate-400">Banner placeholder</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
