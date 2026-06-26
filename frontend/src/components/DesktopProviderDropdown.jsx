import { useEffect, useState } from 'react';
import { getProvidersByCategory } from '../services/providerService';

export default function DesktopProviderDropdown({ category, onProviderSelect, onClose }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    getProvidersByCategory(category).then((items) => {
      if (active) {
        setProviders(items);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [category]);

  const isCompactRow = providers.length <= 10;

  return (
    <div
      className="desktop-provider-dropdown absolute left-0 right-0 top-full border-b border-white/10 shadow-2xl"
      style={{
        background: 'rgba(8, 12, 22, 0.96)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      <div className="mx-auto max-w-[1400px] px-6 py-5 xl:px-8">
        {loading ? (
          <div className="flex h-24 items-center justify-center text-sm text-white/40">
            Loading providers...
          </div>
        ) : (
          <div
            className={
              isCompactRow
                ? 'flex flex-wrap items-start justify-center gap-x-8 gap-y-4'
                : 'grid grid-cols-5 gap-x-3 gap-y-5 sm:grid-cols-8 md:grid-cols-10'
            }
          >
            {providers.map((provider) => (
              <button
                key={`${category}-${provider.name}`}
                type="button"
                onClick={() => {
                  onProviderSelect?.({
                    category,
                    name: provider.name,
                    filterCategory: provider.filterCategory || category,
                    filterProvider: provider.filterProvider || provider.name,
                    gameTitle: provider.gameTitle || null,
                  });
                  onClose?.();
                }}
                className="group flex min-w-[72px] max-w-[92px] flex-col items-center gap-2 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex h-14 w-full min-w-[72px] max-w-[92px] items-center justify-center px-1 transition-transform group-hover:scale-[1.03]">
                  <img
                    src={provider.icon}
                    alt={provider.name}
                    width={88}
                    height={52}
                    draggable={false}
                    className="h-12 w-full max-h-12 object-contain object-center drop-shadow-sm"
                    onError={(event) => {
                      event.currentTarget.src = '/images/game-placeholder.png';
                    }}
                  />
                </div>
                <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight text-white/85 group-hover:text-[#d4af37]">
                  {provider.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
