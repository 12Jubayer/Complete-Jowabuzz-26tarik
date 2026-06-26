import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PlayerMobileNav from '../PlayerMobileNav';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePageShell({ title, children }) {
  const navigate = useNavigate();
  const { loggedIn } = useAuth();

  return (
    <div className={`min-h-screen bg-[#eef1f4] ${loggedIn ? 'pb-[82px]' : 'pb-8'} md:py-6 lg:pb-8`}>
      <div className="mx-auto w-full max-w-md px-3">
        <div className="mb-4 flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        </div>
        {children}
      </div>
      <PlayerMobileNav />
    </div>
  );
}

function EmptyCard({ message = 'No records yet' }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
}

export { EmptyCard };
