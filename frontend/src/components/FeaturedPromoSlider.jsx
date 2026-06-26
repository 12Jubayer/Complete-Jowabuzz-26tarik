import { useEffect, useMemo, useState } from 'react';
import {
  FEATURED_PROMO_BY_PROVIDER,
  FEATURED_PROMO_SLIDES,
  FEATURED_PROVIDERS,
} from '../data/featuredGamesConfig';

function buildSlides(activeProvider, games = []) {
  const fromGames = games
    .filter((game) => game.image || game.imageUrl)
    .slice(0, 3)
    .map((game, index) => ({
      id: game.code || game.id || `game-slide-${index}`,
      image: game.image || game.imageUrl,
      alt: game.title || game.name || 'Featured game',
    }));

  if (fromGames.length) {
    return fromGames;
  }

  const providerImages = FEATURED_PROMO_BY_PROVIDER[activeProvider];
  if (providerImages?.length) {
    return providerImages.map((image, index) => ({
      id: `${activeProvider}-promo-${index}`,
      image,
      alt: `${activeProvider} featured promotion`,
    }));
  }

  return FEATURED_PROMO_SLIDES;
}

export default function FeaturedPromoSlider({ activeProvider = 'FC', games = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const providerMeta = FEATURED_PROVIDERS.find((item) => item.id === activeProvider)
    || FEATURED_PROVIDERS[0];

  const slides = useMemo(
    () => buildSlides(activeProvider, games),
    [activeProvider, games],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [activeProvider, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [slides.length, activeProvider]);

  return (
    <aside className="featured-games__promo">
      <div className="featured-games__promo-frame">
        {slides.map((slide, index) => (
          <img
            key={slide.id}
            src={slide.image}
            alt={slide.alt}
            className={`featured-games__promo-image ${index === activeIndex ? 'is-active' : ''}`}
            loading={index === 0 ? 'eager' : 'lazy'}
            onError={(event) => {
              event.currentTarget.src = '/images/featured/promo-banner.svg';
            }}
          />
        ))}
        <div className="featured-games__promo-overlay" aria-hidden="true" />
        <img
          src={providerMeta.logo}
          alt={providerMeta.label}
          className="featured-games__promo-provider"
        />
        <div className="featured-games__promo-label">
          <span>FEATURED GAMES</span>
        </div>

        {slides.length > 1 ? (
          <div className="featured-games__promo-dots">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Featured promo slide ${index + 1}`}
                className={`featured-games__promo-dot ${index === activeIndex ? 'is-active' : ''}`}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
