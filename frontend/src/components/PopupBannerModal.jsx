import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { fetchSitePopupBanners } from '../services/sitePopupBannerService';

const DISMISS_KEY = 'jowabuzz_dismissed_popup_banners';

function readDismissedIds() {
  try {
    const raw = sessionStorage.getItem(DISMISS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeDismissedIds(ids) {
  sessionStorage.setItem(DISMISS_KEY, JSON.stringify(ids));
}

function resolveCtaTarget(link) {
  const safeLink = String(link || '').trim();
  if (!safeLink) return null;
  if (safeLink.startsWith('http://') || safeLink.startsWith('https://')) {
    return { external: true, href: safeLink };
  }
  return { external: false, href: safeLink.startsWith('/') ? safeLink : `/${safeLink}` };
}

export default function PopupBannerModal() {
  const navigate = useNavigate();
  const [banners, setBanners] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => readDismissedIds());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchSitePopupBanners()
      .then((result) => {
        if (!active) return;
        setBanners(result.data || []);
      })
      .catch(() => {
        if (!active) return;
        setBanners([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const currentBanner = useMemo(
    () => banners.find((banner) => !dismissedIds.includes(Number(banner.id))) || null,
    [banners, dismissedIds],
  );

  if (loading || !currentBanner) return null;

  const dismiss = () => {
    const next = [...new Set([...dismissedIds, Number(currentBanner.id)])];
    setDismissedIds(next);
    writeDismissedIds(next);
  };

  const handleCtaClick = () => {
    const target = resolveCtaTarget(currentBanner.ctaLink);
    dismiss();
    if (!target) return;
    if (target.external) {
      window.location.href = target.href;
      return;
    }
    navigate(target.href);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label="Close popup"
        >
          <X size={18} />
        </button>

        {currentBanner.imageUrl ? (
          <div className="border-b border-slate-100 bg-slate-50">
            <img
              src={currentBanner.imageUrl}
              alt={currentBanner.heading}
              className="max-h-56 w-full object-cover"
            />
          </div>
        ) : null}

        <div className="p-6">
          {currentBanner.title ? (
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {currentBanner.title}
            </p>
          ) : null}
          <h2 className="mt-1 text-xl font-bold text-slate-900">{currentBanner.heading}</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {currentBanner.body}
          </p>

          {currentBanner.ctaLabel && currentBanner.ctaLink ? (
            <button
              type="button"
              onClick={handleCtaClick}
              className="mt-5 inline-flex rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              {currentBanner.ctaLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
