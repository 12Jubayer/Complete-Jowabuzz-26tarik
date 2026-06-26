import { listAllVipLevels } from '../services/vipLevelService.js';

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

function mapPublicVipLevel(level) {
  const theme = VIP_THEMES[level.level] || VIP_THEMES[VIP_THEMES.length - 1];
  const tierName = VIP_TIER_NAMES[level.level] || `VIP ${level.level}`;

  return {
    id: `vip-${level.level}`,
    name: tierName.toUpperCase(),
    tierName,
    level: level.level,
    expRequired: formatExp(level.expRequired),
    levelUpBonus: formatMoney(level.levelUpReward),
    monthlyReward: formatMoney(level.monthlyReward),
    safeCashback: formatPercent(level.safePercent),
    rebate: formatPercent(VIP_REBATE_PERCENT[level.level] ?? 0),
    gradient: theme.gradient,
    glow: theme.glow,
    accent: theme.accent,
    border: theme.border,
  };
}

export async function getPublicVipLevels(req, res) {
  try {
    const levels = await listAllVipLevels({ activeOnly: true });
    return res.json({ data: levels.map(mapPublicVipLevel) });
  } catch (error) {
    console.error('Get public VIP levels error:', error);
    return res.status(500).json({ error: 'Failed to load VIP levels' });
  }
}

export default getPublicVipLevels;
