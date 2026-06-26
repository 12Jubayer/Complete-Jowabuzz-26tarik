import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthToast from './AuthToast';
import LogoLoader from './LogoLoader';
import { colors } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { getGamesByFilter } from '../services/gameService';
import { launchOracleGame } from '../services/gameWalletService';
import PopularGameCard from './PopularGameCard';
import SectionTitle from './SectionTitle';

export default function PopularGames() {
  const navigate = useNavigate();
  const { loggedIn } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let active = true;
    getGamesByFilter({ category: 'hot', limit: 12 })
      .then((rows) => {
        if (active) setGames(rows.slice(0, 12));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  };

  const handlePlay = async (game) => {
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
      showToast(`${game.title || game.name || 'Game'} opened`);
    } catch (error) {
      showToast(error.message || 'Unable to open game');
    } finally {
      setPlayingId(null);
    }
  };

  if (loading) {
    return (
      <section className="popular-games-section jb-mobile-section px-3 py-2 lg:px-4 lg:py-3" style={{ backgroundColor: colors.mainBg }}>
        <div className="flex justify-center py-6">
          <LogoLoader size="sm" label="Loading popular games" />
        </div>
      </section>
    );
  }

  if (!games.length) {
    return null;
  }

  return (
    <section
      className="popular-games-section jb-mobile-section px-3 py-2 lg:px-4 lg:py-3"
      style={{ backgroundColor: colors.mainBg }}
    >
      <AuthToast message={toast} />
      <SectionTitle title="Popular Games" actionLabel="See All" />

      <div className="jb-popular-games hide-scrollbar">
        {games.map((game) => {
          const gameKey = game.code || game.id;

          return (
            <div key={gameKey} className="jb-popular-games__item">
              <PopularGameCard
                title={game.title || game.name}
                image={game.image || game.imageUrl}
                onClick={() => handlePlay(game)}
                disabled={playingId === gameKey}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
