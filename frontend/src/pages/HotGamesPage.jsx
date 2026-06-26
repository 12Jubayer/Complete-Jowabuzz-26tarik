import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../config/theme';
import GameGrid from '../components/GameGrid';
import MobilePageLayout from '../layouts/MobilePageLayout';

export default function HotGamesPage() {
  const navigate = useNavigate();

  return (
    <MobilePageLayout>
      <div className="px-3 pt-3 lg:px-4">
        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-200 hover:bg-white/5"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-base font-semibold text-white">Hot Games</h1>
            <p className="text-xs text-slate-400">সব হট গেমস একসাথে</p>
          </div>
        </div>
      </div>

      <GameGrid selectedCategory="hot" hotPreviewLimit={false} />
    </MobilePageLayout>
  );
}
