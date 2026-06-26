const VIP_TIER_NAMES = [
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Diamond',
  'Black Diamond',
  'Elite',
  'Royal',
  'Legend',
  'Supreme',
];

const VIP_REBATE_PERCENT = [0, 0.05, 0.05, 0.1, 0.1, 0.1, 0.15, 0.15, 0.2, 0.2];

const VIP_THEMES = [
  {
    gradient: 'linear-gradient(180deg, rgba(122, 74, 40, 0.35) 0%, rgba(26, 16, 10, 0.95) 100%)',
    glow: 'rgba(184, 115, 51, 0.45)',
    accent: '#cd7f32',
    border: 'rgba(205, 127, 50, 0.55)',
  },
  {
    gradient: 'linear-gradient(180deg, rgba(148, 163, 184, 0.28) 0%, rgba(30, 41, 59, 0.95) 100%)',
    glow: 'rgba(148, 163, 184, 0.4)',
    accent: '#cbd5e1',
    border: 'rgba(203, 213, 225, 0.45)',
  },
  {
    gradient: 'linear-gradient(180deg, rgba(212, 175, 55, 0.32) 0%, rgba(58, 44, 12, 0.95) 100%)',
    glow: 'rgba(212, 175, 55, 0.45)',
    accent: '#f5d76e',
    border: 'rgba(212, 175, 55, 0.55)',
  },
  {
    gradient: 'linear-gradient(180deg, rgba(34, 211, 238, 0.24) 0%, rgba(8, 47, 73, 0.95) 100%)',
    glow: 'rgba(34, 211, 238, 0.35)',
    accent: '#22d3ee',
    border: 'rgba(34, 211, 238, 0.45)',
  },
  {
    gradient: 'linear-gradient(180deg, rgba(59, 130, 246, 0.28) 0%, rgba(15, 23, 42, 0.95) 100%)',
    glow: 'rgba(59, 130, 246, 0.4)',
    accent: '#60a5fa',
    border: 'rgba(96, 165, 250, 0.5)',
  },
  {
    gradient: 'linear-gradient(180deg, rgba(124, 58, 237, 0.3) 0%, rgba(30, 27, 75, 0.95) 100%)',
    glow: 'rgba(124, 58, 237, 0.45)',
    accent: '#a78bfa',
    border: 'rgba(167, 139, 250, 0.5)',
  },
  {
    gradient: 'linear-gradient(180deg, rgba(220, 38, 38, 0.24) 0%, rgba(69, 10, 10, 0.95) 100%)',
    glow: 'rgba(248, 113, 113, 0.35)',
    accent: '#f87171',
    border: 'rgba(248, 113, 113, 0.45)',
  },
  {
    gradient: 'linear-gradient(180deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 44, 36, 0.95) 100%)',
    glow: 'rgba(16, 185, 129, 0.35)',
    accent: '#34d399',
    border: 'rgba(52, 211, 153, 0.45)',
  },
  {
    gradient: 'linear-gradient(180deg, rgba(168, 85, 247, 0.28) 0%, rgba(46, 16, 72, 0.95) 100%)',
    glow: 'rgba(168, 85, 247, 0.4)',
    accent: '#c084fc',
    border: 'rgba(192, 132, 252, 0.45)',
  },
  {
    gradient: 'linear-gradient(180deg, rgba(202, 138, 4, 0.28) 0%, rgba(41, 37, 16, 0.95) 100%)',
    glow: 'rgba(234, 179, 8, 0.4)',
    accent: '#facc15',
    border: 'rgba(250, 204, 21, 0.5)',
  },
];

function formatPercent(value) {
  const numeric = Number(value);
  if (!numeric) return '0%';
  const text = Number.isInteger(numeric) ? String(numeric) : String(numeric);
  return `${text}%`;
}

function formatMoney(value) {
  return `৳ ${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
}

function formatExp(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

function parseMoney(value) {
  if (typeof value === 'number') return value;
  return Number(String(value).replace(/[^\d.]/g, '')) || 0;
}

function parsePercent(value) {
  if (typeof value === 'number') return value;
  return Number(String(value).replace('%', '')) || 0;
}

export function mapVipLevelForDisplay(level) {
  const levelNumber = Number(level.level ?? 0);
  const theme = VIP_THEMES[levelNumber] || VIP_THEMES[VIP_THEMES.length - 1];
  const tierName = VIP_TIER_NAMES[levelNumber] || `VIP ${levelNumber}`;

  const expRequired = level.expRequired ?? level.exp_required ?? 0;
  const levelUpReward = level.levelUpReward ?? level.level_up_reward ?? parseMoney(level.levelUpBonus);
  const monthlyReward = level.monthlyReward ?? level.monthly_reward ?? parseMoney(level.monthlyReward);
  const safePercent = level.safePercent ?? level.safe_percent ?? parsePercent(level.safeCashback);

  return {
    id: level.id || `vip-${levelNumber}`,
    name: tierName.toUpperCase(),
    tierName,
    level: levelNumber,
    expRequired: typeof expRequired === 'string' ? expRequired : formatExp(expRequired),
    levelUpBonus: typeof level.levelUpBonus === 'string' ? level.levelUpBonus : formatMoney(levelUpReward),
    monthlyReward:
      typeof level.monthlyReward === 'string' && level.monthlyReward.includes('৳')
        ? level.monthlyReward
        : formatMoney(monthlyReward),
    safeCashback:
      typeof level.safeCashback === 'string' ? level.safeCashback : formatPercent(safePercent),
    rebate:
      typeof level.rebate === 'string'
        ? level.rebate
        : formatPercent(VIP_REBATE_PERCENT[levelNumber] ?? 0),
    gradient: level.gradient || theme.gradient,
    glow: level.glow || theme.glow,
    accent: level.accent || theme.accent,
    border: level.border || theme.border,
  };
}

export function getFallbackVipLevels() {
  return [
    { level: 0, expRequired: 0, levelUpReward: 0, monthlyReward: 0, safePercent: 0 },
    { level: 1, expRequired: 3000, levelUpReward: 60, monthlyReward: 30, safePercent: 0.2 },
    { level: 2, expRequired: 30000, levelUpReward: 180, monthlyReward: 90, safePercent: 0.2 },
    { level: 3, expRequired: 500000, levelUpReward: 600, monthlyReward: 280, safePercent: 0.2 },
    { level: 4, expRequired: 5000000, levelUpReward: 1600, monthlyReward: 600, safePercent: 0.3 },
    { level: 5, expRequired: 10000000, levelUpReward: 4000, monthlyReward: 1600, safePercent: 0.3 },
    { level: 6, expRequired: 800000000, levelUpReward: 16000, monthlyReward: 4000, safePercent: 0.3 },
    { level: 7, expRequired: 2000000000, levelUpReward: 40000, monthlyReward: 10000, safePercent: 0.4 },
    { level: 8, expRequired: 5000000000, levelUpReward: 100000, monthlyReward: 25000, safePercent: 0.4 },
    { level: 9, expRequired: 10000000000, levelUpReward: 250000, monthlyReward: 60000, safePercent: 0.5 },
  ].map(mapVipLevelForDisplay);
}
