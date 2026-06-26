import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { colors } from '../config/theme';
import LogoLoader from '../components/LogoLoader';
import MobilePageLayout from '../layouts/MobilePageLayout';
import { getPromotions } from '../services/promotionService';

function PromotionCta({ promotion }) {
  const label = promotion.ctaLabel || 'Join Now';
  const link = promotion.ctaLink;

  if (!link) {
    return (
      <span className="mt-4 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
        {label}
      </span>
    );
  }

  if (/^https?:\/\//i.test(link)) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        {label}
      </a>
    );
  }

  return (
    <Link
      to={link}
      className="mt-4 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
    >
      {label}
    </Link>
  );
}

export default function PromotionPage() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPromotions = useCallback(async () => {
    try {
      const data = await getPromotions();
      setPromotions(Array.isArray(data) ? data : []);
    } catch {
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromotions();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadPromotions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadPromotions]);

  return (
    <MobilePageLayout>
      <section className="px-4 py-6">
        <div className="mb-6 flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
            style={{
              borderColor: colors.border,
              backgroundColor: colors.sectionBg,
              color: colors.green,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="8" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 8V20" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 12H20" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 8C8 5.79086 9.79086 4 12 4C14.2091 4 16 5.79086 16 8" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: colors.textWhite }}>
              Promotions &amp; Offers
            </h1>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: colors.textGray }}>
              Grab the latest bonuses and exclusive deals from JowaBuzz.
            </p>
          </div>
        </div>

        {loading ? (
          <div
            className="flex items-center justify-center rounded-2xl border px-4 py-10"
            style={{
              backgroundColor: colors.sectionBg,
              borderColor: colors.border,
            }}
          >
            <LogoLoader size="md" label="Loading promotions" />
          </div>
        ) : null}

        {!loading && promotions.length === 0 ? (
          <div
            className="rounded-2xl border px-4 py-10 text-center"
            style={{
              backgroundColor: colors.sectionBg,
              borderColor: colors.border,
            }}
          >
            <p className="text-sm" style={{ color: colors.textGray }}>
              No active promotions right now. Check back soon.
            </p>
          </div>
        ) : null}

        {!loading && promotions.length > 0 ? (
          <div className="space-y-4">
            {promotions.map((promotion) => (
              <article
                key={promotion.id}
                className="overflow-hidden rounded-2xl border"
                style={{
                  backgroundColor: colors.sectionBg,
                  borderColor: colors.border,
                }}
              >
                {promotion.imageUrl ? (
                  <img
                    src={promotion.imageUrl}
                    alt={promotion.title}
                    className="h-40 w-full object-cover"
                  />
                ) : null}

                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold" style={{ color: colors.textWhite }}>
                      {promotion.title}
                    </h2>
                    {promotion.badge ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                        {promotion.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: colors.textGray }}>
                    {promotion.description}
                  </p>
                  <PromotionCta promotion={promotion} />
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </MobilePageLayout>
  );
}
