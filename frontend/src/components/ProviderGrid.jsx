import { useEffect, useState } from 'react';
import { getProvidersByCategory } from '../services/gameService';
import ProviderGridSkeleton from './ProviderGridSkeleton';
import ProviderLogoImage from './ProviderLogoImage';

export default function ProviderGrid({
  category,
  activeProviderCode = null,
  onProviderSelect,
}) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    getProvidersByCategory(category)
      .then((items) => {
        if (active) setProviders(items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category]);

  if (loading) {
    return <ProviderGridSkeleton />;
  }

  if (!providers.length) {
    return (
      <div className="jb-category-empty py-10 text-center text-sm text-slate-400">
        No Provider Available
      </div>
    );
  }

  return (
    <div className="jb-category-provider-grid">
      {providers.map((provider) => {
        const providerCode = provider.code || provider.id || provider.name;
        const isActive = activeProviderCode
          && String(activeProviderCode).toLowerCase() === String(providerCode).toLowerCase();

        return (
          <button
            key={`${category}-${providerCode}`}
            type="button"
            className={`jb-category-provider-card${isActive ? ' jb-category-provider-card--active' : ''}`}
            onClick={() => onProviderSelect?.(provider)}
          >
            <div className="jb-category-provider-card__logo-wrap">
              <ProviderLogoImage
                provider={provider}
                className="jb-category-provider-card__logo"
                alt={provider.name}
              />
            </div>
            <span className="jb-category-provider-card__name">{provider.name}</span>
          </button>
        );
      })}
    </div>
  );
}
