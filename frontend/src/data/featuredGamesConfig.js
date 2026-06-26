export const FEATURED_PROVIDERS = [
  { id: 'FC', label: 'FC', logo: '/images/providers/fc.svg' },
  { id: 'JILI', label: 'JILI', logo: '/images/providers/jili.svg' },
  { id: 'JDB', label: 'JDB', logo: '/images/providers/jdb.svg' },
  { id: 'PP', label: 'PP', logo: '/images/providers/pp.svg' },
  { id: 'WorldMatch', label: 'WorldMatch', logo: '/images/providers/worldmatch.svg' },
  { id: 'FastSpin', label: 'FastSpin', logo: '/images/providers/fastspin.svg' },
];

export const FEATURED_PROMO_SLIDES = [
  {
    id: 'promo-main',
    image: '/images/featured/promo-banner.svg',
    alt: 'Featured Games promotion',
  },
  {
    id: 'promo-1',
    image: '/images/games/mega-ace.svg',
    alt: 'Mega Ace',
  },
  {
    id: 'promo-2',
    image: '/images/games/fortune-gems.svg',
    alt: 'Fortune Gems',
  },
  {
    id: 'promo-3',
    image: '/images/games/gates-of-olympus.svg',
    alt: 'Gates of Olympus',
  },
];

export const FEATURED_PROMO_BY_PROVIDER = {
  FC: [
    '/images/featured/promo-banner.svg',
    '/images/games/mega-ace.svg',
    '/images/games/fortune-gems.svg',
  ],
  JILI: [
    '/images/featured/promo-banner.svg',
    '/images/games/super-ace.svg',
    '/images/games/mega-ace.svg',
  ],
  JDB: [
    '/images/featured/promo-banner.svg',
    '/images/games/mahjong-ways.svg',
    '/images/games/mahjong-ways-2.svg',
  ],
  PP: [
    '/images/featured/promo-banner.svg',
    '/images/games/sweet-bonanza.svg',
    '/images/games/gates-of-olympus.svg',
  ],
  WorldMatch: [
    '/images/featured/promo-banner.svg',
    '/images/games/starlight-princess.svg',
    '/images/games/agent-ace.svg',
  ],
  FastSpin: [
    '/images/featured/promo-banner.svg',
    '/images/games/super-ace.svg',
    '/images/games/go-rush.svg',
  ],
};

const fcGames = [
  { code: 'fc-golden-genie', title: 'FC GOLDEN GENIE', image: '/images/games/fortune-gems.svg', multiplier: '10000X' },
  { code: 'fc-chinese-new-year', title: 'FC CHINESE NEW YEAR', image: '/images/games/mega-ace.svg', multiplier: '16800X' },
  { code: 'fc-treasure-aztec', title: 'FC TREASURE AZTEC', image: '/images/games/gates-of-olympus.svg', multiplier: '8888X' },
  { code: 'fc-lucky-fortune', title: 'FC LUCKY FORTUNE', image: '/images/games/sweet-bonanza.svg' },
  { code: 'fc-gold-rush', title: 'FC GOLD RUSH', image: '/images/games/mega-ace.svg', multiplier: '5000X' },
  { code: 'fc-phoenix-rise', title: 'FC PHOENIX RISE', image: '/images/games/starlight-princess.svg' },
  { code: 'fc-emperor-gold', title: 'FC EMPEROR GOLD', image: '/images/games/mahjong-ways.svg' },
  { code: 'fc-dragon-legend', title: 'FC DRAGON LEGEND', image: '/images/games/mahjong-ways-2.svg', multiplier: '12000X' },
  { code: 'fc-jade-temple', title: 'FC JADE TEMPLE', image: '/images/games/super-ace.svg' },
  { code: 'fc-royal-crown', title: 'FC ROYAL CROWN', image: '/images/games/super-ace-deluxe.svg' },
];

const jiliGames = [
  { code: 'jili-mega-ace', title: 'MEGA ACE', image: '/images/games/mega-ace.svg', multiplier: '10000X' },
  { code: 'jili-fortune-gems', title: 'FORTUNE GEMS', image: '/images/games/fortune-gems.svg', multiplier: '8888X' },
  { code: 'jili-super-ace', title: 'SUPER ACE', image: '/images/games/super-ace.svg' },
  { code: 'jili-agent-ace', title: 'AGENT ACE', image: '/images/games/agent-ace.svg', multiplier: '5000X' },
  { code: 'jili-go-rush', title: 'GO RUSH', image: '/images/games/go-rush.svg' },
  { code: 'jili-super-deluxe', title: 'SUPER ACE DELUXE', image: '/images/games/super-ace-deluxe.svg' },
  { code: 'jili-golden-empire', title: 'GOLDEN EMPIRE', image: '/images/games/fortune-gems.svg' },
  { code: 'jili-boxing-king', title: 'BOXING KING', image: '/images/games/mega-ace.svg', multiplier: '6600X' },
  { code: 'jili-money-coming', title: 'MONEY COMING', image: '/images/games/sweet-bonanza.svg' },
  { code: 'jili-charge-buffalo', title: 'CHARGE BUFFALO', image: '/images/games/gates-of-olympus.svg' },
];

const jdbGames = [
  { code: 'jdb-lucky-neko', title: 'LUCKY NEKO', image: '/images/games/mahjong-ways.svg', multiplier: '8888X' },
  { code: 'jdb-mahjong', title: 'MAHJONG WAYS', image: '/images/games/mahjong-ways-2.svg' },
  { code: 'jdb-golden-panther', title: 'GOLDEN PANTHER', image: '/images/games/fortune-gems.svg' },
  { code: 'jdb-prosperity', title: 'PROSPERITY', image: '/images/games/mega-ace.svg', multiplier: '10000X' },
  { code: 'jdb-treasure-bowl', title: 'TREASURE BOWL', image: '/images/games/starlight-princess.svg' },
  { code: 'jdb-fortune-tree', title: 'FORTUNE TREE', image: '/images/games/super-ace.svg' },
  { code: 'jdb-dragon-legend', title: 'DRAGON LEGEND', image: '/images/games/gates-of-olympus.svg' },
  { code: 'jdb-lucky-lion', title: 'LUCKY LION', image: '/images/games/sweet-bonanza.svg', multiplier: '5200X' },
  { code: 'jdb-koi-gate', title: 'KOI GATE', image: '/images/games/super-ace-deluxe.svg' },
  { code: 'jdb-phoenix', title: 'PHOENIX RISING', image: '/images/games/agent-ace.svg' },
];

const ppGames = [
  { code: 'pp-sweet-bonanza', title: 'SWEET BONANZA', image: '/images/games/sweet-bonanza.svg', multiplier: '21100X' },
  { code: 'pp-gates-olympus', title: 'GATES OF OLYMPUS', image: '/images/games/gates-of-olympus.svg', multiplier: '5000X' },
  { code: 'pp-starlight', title: 'STARLIGHT PRINCESS', image: '/images/games/starlight-princess.svg' },
  { code: 'pp-big-bass', title: 'BIG BASS BONANZA', image: '/images/games/fortune-gems.svg' },
  { code: 'pp-dog-house', title: 'THE DOG HOUSE', image: '/images/games/mega-ace.svg', multiplier: '6750X' },
  { code: 'pp-wolf-gold', title: 'WOLF GOLD', image: '/images/games/super-ace.svg' },
  { code: 'pp-sugar-rush', title: 'SUGAR RUSH', image: '/images/games/sweet-bonanza.svg', multiplier: '5000X' },
  { code: 'pp-madame-destiny', title: 'MADAME DESTINY', image: '/images/games/starlight-princess.svg' },
  { code: 'pp-mustang-gold', title: 'MUSTANG GOLD', image: '/images/games/gates-of-olympus.svg' },
  { code: 'pp-fruit-party', title: 'FRUIT PARTY', image: '/images/games/super-ace-deluxe.svg' },
];

const worldMatchGames = [
  { code: 'wm-royal-777', title: 'ROYAL 777', image: '/images/games/mega-ace.svg', multiplier: '7777X' },
  { code: 'wm-golden-dragon', title: 'GOLDEN DRAGON', image: '/images/games/mahjong-ways.svg' },
  { code: 'wm-lucky-spin', title: 'LUCKY SPIN', image: '/images/games/fortune-gems.svg', multiplier: '9000X' },
  { code: 'wm-emerald-city', title: 'EMERALD CITY', image: '/images/games/super-ace.svg' },
  { code: 'wm-diamond-king', title: 'DIAMOND KING', image: '/images/games/starlight-princess.svg' },
  { code: 'wm-neon-vegas', title: 'NEON VEGAS', image: '/images/games/sweet-bonanza.svg', multiplier: '6600X' },
  { code: 'wm-crystal-quest', title: 'CRYSTAL QUEST', image: '/images/games/gates-of-olympus.svg' },
  { code: 'wm-mega-fortune', title: 'MEGA FORTUNE', image: '/images/games/mega-ace.svg' },
  { code: 'wm-jungle-king', title: 'JUNGLE KING', image: '/images/games/agent-ace.svg', multiplier: '4500X' },
  { code: 'wm-ocean-pearl', title: 'OCEAN PEARL', image: '/images/games/mahjong-ways-2.svg' },
];

const fastSpinGames = [
  { code: 'fs-spin-king', title: 'SPIN KING', image: '/images/games/super-ace.svg', multiplier: '8000X' },
  { code: 'fs-blitz-reels', title: 'BLITZ REELS', image: '/images/games/mega-ace.svg' },
  { code: 'fs-neon-fruits', title: 'NEON FRUITS', image: '/images/games/sweet-bonanza.svg', multiplier: '5500X' },
  { code: 'fs-cash-blitz', title: 'CASH BLITZ', image: '/images/games/fortune-gems.svg' },
  { code: 'fs-turbo-gold', title: 'TURBO GOLD', image: '/images/games/gates-of-olympus.svg' },
  { code: 'fs-fire-spin', title: 'FIRE SPIN', image: '/images/games/starlight-princess.svg', multiplier: '7200X' },
  { code: 'fs-mega-spin', title: 'MEGA SPIN', image: '/images/games/super-ace-deluxe.svg' },
  { code: 'fs-lucky-wheel', title: 'LUCKY WHEEL', image: '/images/games/go-rush.svg' },
  { code: 'fs-jackpot-rush', title: 'JACKPOT RUSH', image: '/images/games/mega-ace.svg', multiplier: '10000X' },
  { code: 'fs-rapid-win', title: 'RAPID WIN', image: '/images/games/agent-ace.svg' },
];

export const FEATURED_FALLBACK_GAMES = {
  FC: fcGames,
  JILI: jiliGames,
  JDB: jdbGames,
  PP: ppGames,
  WorldMatch: worldMatchGames,
  FastSpin: fastSpinGames,
};

export function getFeaturedFallbackGames(providerId) {
  return FEATURED_FALLBACK_GAMES[providerId] || fcGames;
}

export default FEATURED_PROVIDERS;
