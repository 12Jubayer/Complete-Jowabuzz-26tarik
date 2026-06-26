import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthToast from './AuthToast';
import GameGridSkeleton from './GameGridSkeleton';
import { uiConfig } from '../config/uiConfig';
import { colors } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { getGamesByFilter } from '../services/gameService';
import { launchOracleGame } from '../services/gameWalletService';
import GameCard from './GameCard';

export const HOT_GAMES_HOME_LIMIT = 28;
export const HOT_GAMES_PAGE_PATH = '/hot-games';

export default function GameGrid({
  selectedCategory,
  selectedProvider,
  selectedGameTitle,
  hotPreviewLimit = HOT_GAMES_HOME_LIMIT,
  embedded = false,
}) {
  const navigate = useNavigate();
  const { loggedIn } = useAuth();
  const [allGames, setAllGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  };

  const isHotPreview = useMemo(() => {
    const category = selectedCategory || 'hot';
    return category === 'hot' && !selectedProvider && !selectedGameTitle && hotPreviewLimit !== false;
  }, [selectedCategory, selectedProvider, selectedGameTitle, hotPreviewLimit]);

  const previewLimit = isHotPreview ? Number(hotPreviewLimit) || HOT_GAMES_HOME_LIMIT : null;

  const displayGames = useMemo(() => {
    if (!previewLimit) return allGames;
    return allGames.slice(0, previewLimit);
  }, [allGames, previewLimit]);

  const showSeeMore = isHotPreview && allGames.length > (previewLimit || HOT_GAMES_HOME_LIMIT);

  useEffect(() => {
    let active = true;
    setLoading(true);

    getGamesByFilter({
      category: selectedCategory,
      provider: selectedProvider,
      gameTitle: selectedGameTitle,
    })
      .then((games) => {
        if (active) setAllGames(games);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCategory, selectedProvider, selectedGameTitle]);

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
          gameCode: (!game.gameId || !game.providerId) ? (game.code || game.id) : undefined,
        });
        showToast(`${game.title || game.name || 'Game'} opened in new tab`);
      } catch (error) {
        showToast(error.message || 'Unable to play game');
      } finally {
        setPlayingId(null);
      }
    },
    [loggedIn, navigate],
  );

  const content = (
    <>
      <AuthToast message={toast} />

      {loading ? (
        <GameGridSkeleton />
      ) : displayGames.length === 0 ? (
        <div className="jb-category-empty py-8 text-center text-sm text-slate-500">No Games Found</div>
      ) : (
        <>
          <div
            className="jb-game-grid grid grid-cols-4 lg:grid-cols-8"
            style={{ gap: uiConfig.mobile.gameGridGap }}
          >
            {displayGames.map((game) => {
              const gameKey = game.gameId || `${game.providerId || 'p'}-${game.code || game.id}`;
              return (
                <GameCard
                  key={gameKey}
                  title={game.title || game.name}
                  image={game.image || game.imageUrl}
                  onClick={() => handlePlay(game)}
                  disabled={playingId === gameKey}
                />
              );
            })}
          </div>

          {showSeeMore ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                className="jb-hot-see-more"
                onClick={() => navigate(HOT_GAMES_PAGE_PATH)}
              >
                See More
              </button>
            </div>
          ) : null}
        </>
      )}
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <section
      className="jb-mobile-section px-3 py-3 lg:px-4 lg:py-5"
      style={{ backgroundColor: colors.mainBg }}
    >
      {content}
    </section>
  );
}
