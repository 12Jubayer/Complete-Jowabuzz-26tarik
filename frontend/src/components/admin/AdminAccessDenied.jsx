import { ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminAccessDenied() {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
          <ShieldX size={28} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Access Denied</h2>
        <p className="mt-2 text-sm text-slate-500">
          You do not have permission to view this page. Contact a super admin if you need access.
        </p>
        <Link
          to="/admin/dashboard"
          className="mt-5 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
