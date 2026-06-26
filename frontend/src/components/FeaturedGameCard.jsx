import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LogoLoader from './LogoLoader';
import AuthToast from './AuthToast';
import { FEATURED_PROVIDERS } from '../data/featuredGamesConfig';
import { useAuth } from '../context/AuthContext';
import { launchOracleGame } from '../services/gameWalletService';

const FEATURED_GRID_ROWS = 2;
const FEATURED_CARD_FOOTER_HEIGHT = 24;
const FEATURED_MEDIA_HEIGHT_RATIO = 1;

function getFeaturedGridCols(width) {
  if (width >= 1024) return 5;
  if (width >= 640) return 4;
  if (width >= 480) return 3;
  return 2;
}

function resolveProviderLogo(providerKey, game) {
  const providerId = String(providerKey || game.provider || game.providerCode || '').trim();
  const match = FEATURED_PROVIDERS.find(
    (item) => item.id.toLowerCase() === providerId.toLowerCase()
      || item.label.toLowerCase() === providerId.toLowerCase(),
  );
  return match?.logo || null;
}

export default function FeaturedGameCard({ game, onPlay, disabled = false, providerKey = '' }) {
  const title = game.title || game.name || 'Game';
  const image = game.image || game.imageUrl || '/images/games/fortune-gems.svg';
  const providerLogo = resolveProviderLogo(providerKey, game);

  return (
    <article className="featured-game-card">
      <button
        type="button"
        className="featured-game-card__button"
        onClick={() => onPlay?.(game)}
        disabled={disabled}
      >
        <div className="featured-game-card__media">
          <img
            src={image}
            alt={title}
            className="featured-game-card__image"
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.src = '/images/games/fortune-gems.svg';
            }}
          />
          {providerLogo ? (
            <img
              src={providerLogo}
              alt=""
              className="featured-game-card__provider-badge"
              aria-hidden="true"
            />
          ) : null}
          {game.multiplier ? (
            <span className="featured-game-card__multiplier">{game.multiplier}</span>
          ) : null}
          <span className="featured-game-card__play-overlay" aria-hidden="true">
            <span className="featured-game-card__play-btn">
              <Play size={16} fill="currentColor" />
            </span>
          </span>
        </div>
        <div className="featured-game-card__footer">
          <p className="featured-game-card__title" title={title}>
            {title}
          </p>
        </div>
      </button>
    </article>
  );
}

export function FeaturedGameCardGrid({ games, loading, providerKey, onBodyHeightChange }) {
  const navigate = useNavigate();
  const { loggedIn } = useAuth();
  const [playingId, setPlayingId] = useState(null);
  const [toast, setToast] = useState('');
  const [page, setPage] = useState(0);
  const [cols, setCols] = useState(() => getFeaturedGridCols(window.innerWidth));
  const gridRef = useRef(null);

  const pageSize = cols * FEATURED_GRID_ROWS;
  const totalPages = Math.max(1, Math.ceil(games.length / pageSize));
  const visibleGames = games.slice(page * pageSize, page * pageSize + pageSize);

  useEffect(() => {
    setPage(0);
  }, [providerKey]);

  useEffect(() => {
    const onResize = () => setCols(getFeaturedGridCols(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (page >= totalPages) {
      setPage(0);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (totalPages <= 1) return undefined;

    const timer = window.setInterval(() => {
      setPage((current) => (current + 1) % totalPages);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [totalPages, providerKey]);

  useLayoutEffect(() => {
    const measure = () => {
      const grid = gridRef.current;
      if (!grid || loading) return;

      const styles = getComputedStyle(grid);
      const rowGap = parseFloat(styles.rowGap || styles.gap) || 8;
      const columnGap = parseFloat(styles.columnGap || styles.gap) || rowGap;
      const gridWidth = grid.clientWidth;

      if (!gridWidth) return;

      const cardWidth = (gridWidth - columnGap * (cols - 1)) / cols;
      const cardHeight = cardWidth * FEATURED_MEDIA_HEIGHT_RATIO + FEATURED_CARD_FOOTER_HEIGHT;
      const bodyHeight = Math.round(cardHeight * FEATURED_GRID_ROWS + rowGap);

      grid.style.setProperty('--fg-card-width', `${Math.round(cardWidth)}px`);
      onBodyHeightChange?.(bodyHeight);
    };

    measure();

    const observer = new ResizeObserver(measure);
    if (gridRef.current) {
      observer.observe(gridRef.current);
    }

    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [games, page, loading, cols, onBodyHeightChange]);

  const showToast = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  }, []);

  const handlePlay = useCallback(
    async (game) => {
      if (!loggedIn) {
        navigate('/auth?tab=login');
        return;
      }

      const gameCode = game.code || game.id;
      setPlayingId(gameCode);

      try {
        await launchOracleGame({
          gameId: game.gameId,
          providerId: game.providerId,
          gameCode: (!game.gameId || !game.providerId) ? gameCode : undefined,
        });
        showToast(`${game.title || game.name || 'Game'} opened in new tab`);
      } catch (error) {
        showToast(error.message || 'Unable to open game');
      } finally {
        setPlayingId(null);
      }
    },
    [loggedIn, navigate, showToast],
  );

  const goPrev = () => {
    setPage((current) => (current - 1 + totalPages) % totalPages);
  };

  const goNext = () => {
    setPage((current) => (current + 1) % totalPages);
  };

  if (loading) {
    return (
      <div className="featured-games__loading">
        <LogoLoader size="md" label="Loading featured games" />
      </div>
    );
  }

  return (
    <div className="featured-games__carousel">
      <AuthToast message={toast} />
      {totalPages > 1 ? (
        <>
          <button
            type="button"
            className="featured-games__nav featured-games__nav--prev"
            aria-label="Previous featured games"
            onClick={goPrev}
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            className="featured-games__nav featured-games__nav--next"
            aria-label="Next featured games"
            onClick={goNext}
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </>
      ) : null}

      <div
        ref={gridRef}
        className={`featured-games__grid featured-games__grid--cols-${cols}`}
      >
        {visibleGames.map((game) => {
          const key = game.code || game.id;
          return (
            <FeaturedGameCard
              key={key}
              game={game}
              providerKey={providerKey}
              onPlay={handlePlay}
              disabled={playingId === key}
            />
          );
        })}
      </div>
    </div>
  );
}
