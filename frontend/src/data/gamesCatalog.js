import { games } from './games';
import { getGameImage } from '../utils/gameImages';

const categoryAssignments = {
  'Starlight Princess': { category: 'hot', provider: 'PG' },
  'Sweet Bonanza': { category: 'hot', provider: 'PP' },
  'Mega Ace': { category: 'hot', provider: 'JILI' },
  'Gates of Olympus': { category: 'hot', provider: 'PP' },
  'Super Ace': { category: 'slots', provider: 'JILI' },
  'Mahjong Ways': { category: 'slots', provider: 'PG' },
  'Fortune Gems': { category: 'slots', provider: 'JILI' },
  'Mahjong Ways 2': { category: 'slots', provider: 'PG' },
  Aviator: { category: 'crash', provider: 'SPRIBE' },
  'Super Ace Deluxe': { category: 'slots', provider: 'JILI' },
  Mines: { category: 'crash', provider: 'SPRIBE' },
  'Lightning Roulette': { category: 'casino', provider: 'Evolution' },
  'Agent Ace': { category: 'hot', provider: 'JILI' },
  Balloon: { category: 'crash', provider: 'SmartSoft' },
  'Go Rush': { category: 'crash', provider: 'JILI' },
  'Live Baccarat': { category: 'casino', provider: 'Sexy' },
  'Sexy Baccarat': { category: 'casino', provider: 'Sexy' },
  'Lightning Baccarat': { category: 'table', provider: 'Evolution' },
  'Mega Roulette': { category: 'table', provider: 'Evolution' },
  JetX: { category: 'crash', provider: 'SmartSoft' },
};

export const gamesCatalog = games.map((title, index) => {
  const meta = categoryAssignments[title] || { category: 'hot', provider: 'JILI' };

  return {
    id: `game-${index + 1}`,
    title,
    category: meta.category,
    provider: meta.provider,
    image: getGameImage(title),
  };
});

export default gamesCatalog;
