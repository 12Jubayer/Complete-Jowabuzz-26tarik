import { useMemo } from 'react';
import { colors } from '../config/theme';
import { staticGameProviders } from '../data/publicGameProviders';
import SectionTitle from './SectionTitle';

const DEFAULT_PROVIDER_LOGO = '/images/providers/default.svg';

function ProviderLogo({ provider }) {
  return (
    <img
      src={provider.provider_logo || DEFAULT_PROVIDER_LOGO}
      alt={provider.provider_name}
      className="game-providers-marquee__logo"
      loading="lazy"
      draggable={false}
      onError={(event) => {
        if (event.currentTarget.src.endsWith(DEFAULT_PROVIDER_LOGO)) return;
        event.currentTarget.src = DEFAULT_PROVIDER_LOGO;
      }}
    />
  );
}

export default function ProviderStrip() {
  const providers = staticGameProviders;

  const loopProviders = useMemo(
    () => [...providers, ...providers],
    [providers],
  );

  return (
    <section
      className="game-providers-section jb-mobile-section px-3 lg:px-4"
      style={{ backgroundColor: colors.sectionBg }}
      aria-label="Game Providers"
    >
      <SectionTitle title="Game Providers" />

      <div className="game-providers-marquee">
        <div
          className="game-providers-marquee__track"
          style={{ animationDuration: `${Math.max(providers.length * 2.5, 32)}s` }}
        >
          {loopProviders.map((provider, index) => (
            <div
              key={`${provider.provider_name}-${provider.display_order}-${index}`}
              className="game-providers-marquee__item"
              title={provider.provider_name}
            >
              <ProviderLogo provider={provider} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
