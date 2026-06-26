import { useSiteBranding } from '../context/SiteBrandingContext';

const LOGO_SIZES = {
  sm: 36,
  md: 52,
  lg: 68,
};

export default function LogoLoader({ size = 'md', className = '', label = 'Loading' }) {
  const { logoSrc, siteName } = useSiteBranding();
  const logoWidth = LOGO_SIZES[size] || LOGO_SIZES.md;

  return (
    <div
      className={`logo-loader logo-loader--${size} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="logo-loader__circle logo-loader__circle--left" aria-hidden="true" />
      <div className="logo-loader__spin">
        <img
          src={logoSrc}
          alt={siteName}
          className="logo-loader__logo"
          style={{ width: logoWidth }}
          draggable={false}
        />
      </div>
      <span className="logo-loader__circle logo-loader__circle--right" aria-hidden="true" />
    </div>
  );
}
