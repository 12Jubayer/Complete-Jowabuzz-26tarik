import { menuProviders } from '../data/menuProviders';
import { staticGameProviders } from '../data/publicGameProviders';

const DEFAULT_LOGO = '/images/providers/default.svg';

const CODE_ALIASES = {
  'pragmatic play': 'pp',
  pp: 'pp',
  'pg soft': 'pg',
  pgsoft: 'pg',
  pg: 'pg',
  evolution: 'evolution',
  'evolution gaming': 'evolution',
  evo: 'evo',
  sexy: 'sexy',
  'sexy gaming': 'sexy',
  'sexy baccarat': 'sexy',
  spribe: 'spribe',
  aviator: 'aviator',
  jili: 'jili',
  jdb: 'jdb',
  cq9: 'cq9',
  'cq9 gaming': 'cq9',
  fc: 'fc',
  'fa chai': 'fc',
  ka: 'ka',
  'ka gaming': 'ka',
  netent: 'netent',
  wm: 'wm',
  worldmatch: 'worldmatch',
  smartsoft: 'smartsoft',
  bti: 'bti',
  cmd: 'cmd',
  sbo: 'sbo',
  pinnacle: 'pinnacle',
  sportsbook: 'sportsbook',
  exchange: 'sportsbook',
  horsebook: 'horse',
  horse: 'horse',
  spadegaming: 'sg',
  sg: 'sg',
  km: 'km',
  pt: 'pt',
  turbo: 'turbo',
  bgaming: 'bgaming',
  bbin: 'bbin',
  tcg: 'tcg',
  'tc gaming': 'tcg',
  vr: 'vr',
  ae: 'ae',
  gw: 'gw',
  fastspin: 'fastspin',
  hbrds: 'jili',
  habanero: 'jili',
  habaneroslots: 'jili',
  saba: 'sportsbook',
  sbtech: 'sportsbook',
  insports: 'cmd',
  dg: 'km',
  mg: 'wm',
  hotroad: 'smartsoft',
  creedroomz: 'evolution',
  winfinity: 'pt',
  via: 'sexy',
  luckysports: 'cmd',
  sbos: 'sbo',
  ws: 'sportsbook',
  tbc: 'default',
  'saba sports': 'sportsbook',
  'sbo sports': 'sbo',
  'lucky sports': 'cmd',
  'ws sports': 'sportsbook',
  '2bc sports': 'default',
  '9w': '9w',
  '9wicket': '9w',
  '9wicket sports': '9w',
  rt: 'default',
  'red tiger': 'default',
  play8: 'default',
};

const STATIC_LOOKUP = new Map();

function registerStatic(name, logo) {
  const key = String(name || '').trim().toLowerCase();
  if (!key || !logo) return;
  STATIC_LOOKUP.set(key, logo);
}

Object.values(menuProviders).flat().forEach((provider) => {
  registerStatic(provider.name, provider.logo || provider.icon);
  registerStatic(provider.filterProvider, provider.logo || provider.icon);
});

staticGameProviders.forEach((provider) => {
  registerStatic(provider.provider_name, provider.provider_logo);
});

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
}

function resolveSlug(code, name) {
  const codeKey = slugify(code);
  const nameKey = slugify(name);
  const keys = [codeKey, nameKey, CODE_ALIASES[codeKey], CODE_ALIASES[nameKey]];
  for (const key of keys) {
    if (!key || key === 'default') continue;
    return key;
  }
  return codeKey || nameKey || '';
}

export function getProviderLogoCandidates({ code, name, logo } = {}) {
  const candidates = [];
  const push = (value) => {
    if (!value || candidates.includes(value)) return;
    candidates.push(value);
  };

  const customLogo = String(logo || '').trim();
  if (customLogo && !customLogo.endsWith('default.svg')) {
    const isBrokenOracle9W = /oraclegames\.net\/thumbnail\/9W\/?$/i.test(customLogo);
    if (!isBrokenOracle9W) {
      push(customLogo);
      if (customLogo.endsWith('.png')) {
        push(customLogo.replace(/\.png$/i, '.svg'));
      }
      if (customLogo.endsWith('.svg')) {
        push(customLogo.replace(/\.svg$/i, '.png'));
      }
    }
  }

  const staticLogo = STATIC_LOOKUP.get(String(name || '').trim().toLowerCase())
    || STATIC_LOOKUP.get(String(code || '').trim().toLowerCase());
  if (staticLogo) push(staticLogo);

  const slug = resolveSlug(code, name);
  if (slug) {
    push(`/images/providers/${slug}.svg`);
    push(`/images/providers/${slug}.png`);
  }

  push(DEFAULT_LOGO);
  return candidates;
}

export function resolveProviderLogo(provider = {}) {
  return getProviderLogoCandidates(provider)[0] || DEFAULT_LOGO;
}

export { DEFAULT_LOGO };
