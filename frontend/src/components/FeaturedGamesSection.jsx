import { useCallback, useEffect, useState } from 'react';
import { FEATURED_PROVIDERS } from '../data/featuredGamesConfig';
import { fetchFeaturedGamesByProvider } from '../services/featuredGamesService';
import { FeaturedGameCardGrid } from './FeaturedGameCard';
import FeaturedPromoSlider from './FeaturedPromoSlider';

const FEATURED_DESKTOP_LIMIT = 10;

export default function FeaturedGamesSection() {
  const [activeProvider, setActiveProvider] = useState(FEATURED_PROVIDERS[0].id);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gridBodyHeight, setGridBodyHeight] = useState(null);

  const handleBodyHeightChange = useCallback((height) => {
    setGridBodyHeight((prev) => (prev === height ? prev : height));
  }, []);

  const loadGames = useCallback(async (providerId) => {
    setLoading(true);
    try {
      const data = await fetchFeaturedGamesByProvider(providerId, { limit: FEATURED_DESKTOP_LIMIT });
      setGames(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGames(activeProvider);
  }, [activeProvider, loadGames]);

  return (
    <section className="featured-games-section featured-games-section--mcw">
      <div
        className="featured-games-section__inner"
        style={
          gridBodyHeight
            ? { '--fg-grid-body-height': `${gridBodyHeight}px` }
            : undefined
        }
      >
        <header className="featured-games-section__header">
          <span className="featured-games-section__accent" aria-hidden="true" />
          <h2 className="featured-games-section__title">Featured Games</h2>
        </header>

        <nav className="featured-games__tabs" aria-label="Featured game providers">
          {FEATURED_PROVIDERS.map((provider) => {
            const isActive = activeProvider === provider.id;
            return (
              <button
                key={provider.id}
                type="button"
                className={`featured-games__tab ${isActive ? 'is-active' : ''}`}
                onClick={() => setActiveProvider(provider.id)}
                aria-selected={isActive}
              >
                {provider.label}
              </button>
            );
          })}
        </nav>

        <FeaturedPromoSlider activeProvider={activeProvider} games={games} />

        <div className="featured-games-section__content">
          <FeaturedGameCardGrid
            games={games}
            loading={loading}
            providerKey={activeProvider}
            onBodyHeightChange={handleBodyHeightChange}
          />
        </div>
      </div>
    </section>
  );
}
