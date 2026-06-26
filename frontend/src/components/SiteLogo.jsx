import { Link, useLocation } from 'react-router-dom';
import { uiConfig } from '../config/uiConfig';
import { useSiteBranding } from '../context/SiteBrandingContext';
import {
  AFFILIATE_LOGO_SRC,
  getLogoContext,
  getMainSiteLogoSrc,
  isMainSiteHost,
  JBCASH_LOGO_SRC,
  MAIN_SITE_LOGO_FALLBACK,
} from '../utils/siteContext';

const LOGO_VARIANTS = {
  mobile: {
    width: uiConfig.mobile.logoWidth,
    className: 'site-logo__img h-auto max-h-10 object-contain',
  },
  compact: {
    width: uiConfig.mobile.logoWidth,
    className: 'site-logo__img h-auto max-h-10 object-contain',
  },
  desktop: {
    width: uiConfig.desktopLogoWidth,
    className: 'site-logo__img h-auto object-contain',
  },
  auth: {
    width: uiConfig.logoWidth * 0.75,
    className: 'site-logo__img h-auto object-contain',
  },
  main: {
    width: uiConfig.logoWidth * 0.85,
    className: 'site-logo__img h-auto object-contain',
  },
  drawer: {
    width: uiConfig.logoWidth,
    className: 'site-logo__img h-auto object-contain',
  },
  about: {
    width: uiConfig.desktopLogoWidth || uiConfig.logoWidth,
    className: 'site-logo__img site-about-section__logo h-auto object-contain',
  },
};

export default function SiteLogo({
  variant = 'mobile',
  linkTo = '/',
  className = '',
  linkClassName = '',
  ...imgProps
}) {
  const location = useLocation();
  const { logoSrc, siteName } = useSiteBranding();
  const config = LOGO_VARIANTS[variant] || LOGO_VARIANTS.mobile;
  const onMainSite = isMainSiteHost();
  const logoContext = getLogoContext(location.pathname);

  const resolvedSrc = onMainSite
    ? getMainSiteLogoSrc(logoSrc)
    : logoContext === 'jbcash'
      ? JBCASH_LOGO_SRC
      : logoContext === 'affiliate'
        ? AFFILIATE_LOGO_SRC
        : logoSrc || MAIN_SITE_LOGO_FALLBACK;

  const resolvedAlt = onMainSite
    ? siteName
    : logoContext === 'jbcash'
      ? 'JBCash'
      : logoContext === 'affiliate'
        ? 'JowaBuzz Affiliate'
        : siteName;

  const resolvedLink = onMainSite
    ? linkTo
    : logoContext === 'jbcash'
      ? '/agent/dashboard'
      : logoContext === 'affiliate'
        ? '/affiliate'
        : linkTo;

  const image = (
    <img
      src={resolvedSrc}
      alt={resolvedAlt}
      style={{ width: config.width }}
      className={`${config.className} ${className}`.trim()}
      {...imgProps}
    />
  );

  if (!resolvedLink) return image;

  return (
    <Link
      to={resolvedLink}
      className={`flex shrink-0 items-center transition-opacity duration-300 hover:opacity-90 ${linkClassName}`.trim()}
    >
      {image}
    </Link>
  );
}
