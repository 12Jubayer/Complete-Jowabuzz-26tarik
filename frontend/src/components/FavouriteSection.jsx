import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LogoLoader from './LogoLoader';
import { colors } from '../config/theme';
import { fetchPublicFavouriteSliders } from '../services/favouriteSliderService';
import SectionTitle from './SectionTitle';

function FavouriteSliderCard({ slide, onImageError, className = '' }) {
  const card = (
    <div className={`favourite-slider-card ${className}`.trim()}>
      <img
        src={slide.imageUrl}
        alt={slide.title}
        className="favourite-slider-card__image"
        loading="lazy"
        onError={() => onImageError(slide.id)}
      />
    </div>
  );

  if (slide.linkUrl) {
    const isExternal = /^https?:\/\//i.test(slide.linkUrl);

    if (isExternal) {
      return (
        <a
          href={slide.linkUrl}
          className="favourite-slider-card__link"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={slide.title}
        >
          {card}
        </a>
      );
    }

    return (
      <Link to={slide.linkUrl} className="favourite-slider-card__link" aria-label={slide.title}>
        {card}
      </Link>
    );
  }

  return <div className="favourite-slider-card__link">{card}</div>;
}

export default function FavouriteSection() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failedIds, setFailedIds] = useState(() => new Set());

  const loadSlides = useCallback(async () => {
    try {
      const banners = await fetchPublicFavouriteSliders();
      const nextSlides = banners
        .filter((slide) => slide.imageUrl)
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

      setSlides(nextSlides);
      setFailedIds(new Set());
    } catch {
      setSlides([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlides();

    const onFocus = () => {
      loadSlides();
    };

    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [loadSlides]);

  const visibleSlides = useMemo(
    () => slides.filter((slide) => slide.imageUrl && !failedIds.has(slide.id)),
    [slides, failedIds],
  );

  const loopSlides = visibleSlides.length ? [...visibleSlides, ...visibleSlides] : [];

  const handleImageError = useCallback((id) => {
    setFailedIds((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  return (
    <section
      className="favourite-slider-section jb-mobile-section px-3 py-3 lg:px-4 lg:py-5"
      style={{ backgroundColor: colors.sectionBg }}
      aria-label="Favourites"
    >
      <SectionTitle title="Favourites" showGlow />

      {loading ? (
        <div className="favourite-slider-empty">
          <LogoLoader size="md" label="Loading favourites" />
        </div>
      ) : loopSlides.length ? (
        <div className="favourite-slider-viewport">
          <div
            className="favourite-slider-track"
            style={{ animationDuration: `${Math.max(visibleSlides.length * 12, 24)}s` }}
          >
            {loopSlides.map((slide, index) => (
              <FavouriteSliderCard
                key={`${slide.id}-${index}`}
                slide={slide}
                onImageError={handleImageError}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="favourite-slider-empty">No favourite banners available right now.</div>
      )}
    </section>
  );
}
