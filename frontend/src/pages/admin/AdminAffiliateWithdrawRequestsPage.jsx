import { Link } from 'react-router-dom';
import AdminAffiliateSettlementPage from './AdminAffiliateSettlementPage';

export default function AdminAffiliateWithdrawRequestsPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800">
        Affiliate self-withdraw is disabled. Approve or reject weekly commission from the settlement list below.
        {' '}
        <Link to="/admin/pending-settlement" className="font-semibold underline">
          Open Pending Settlement
        </Link>
      </div>
      <AdminAffiliateSettlementPage />
    </div>
  );
}
