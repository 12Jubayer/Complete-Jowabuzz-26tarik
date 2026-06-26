import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { countries, defaultCountry, getCountryById } from '../config/countries';

const STORAGE_KEY = 'jowabuzz_country';

function readStoredCountryId() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && getCountryById(stored).active) return stored;
  } catch {
    // ignore storage errors
  }
  return defaultCountry.id;
}

export default function CountrySelector() {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(readStoredCountryId);
  const selected = getCountryById(selectedId);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSelect = (country) => {
    if (!country.active) return;
    setSelectedId(country.id);
    localStorage.setItem(STORAGE_KEY, country.id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={`Country: ${selected.name}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="group flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/50"
        style={{
          boxShadow: '0 0 0 1px rgba(34, 197, 94, 0.28), 0 0 10px rgba(34, 197, 94, 0.12)',
        }}
      >
        <img
          src={selected.flag}
          alt={selected.name}
          width={36}
          height={36}
          draggable={false}
          className="h-9 w-9 rounded-full object-cover"
        />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[210px] overflow-hidden rounded-xl border shadow-xl"
          style={{
            backgroundColor: '#111827',
            borderColor: 'rgba(255, 255, 255, 0.12)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
          }}
          role="listbox"
          aria-label="Select country"
        >
          <div
            className="border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/50"
            style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
          >
            Country
          </div>

          {countries.map((country) => {
            const isSelected = country.id === selectedId;
            const isDisabled = !country.active;

            return (
              <button
                key={country.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={isDisabled}
                onClick={() => handleSelect(country)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  isDisabled
                    ? 'cursor-not-allowed opacity-45'
                    : 'hover:bg-white/5'
                } ${isSelected ? 'bg-white/[0.04]' : ''}`}
              >
                <img
                  src={country.flag}
                  alt=""
                  width={28}
                  height={28}
                  draggable={false}
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{country.name}</p>
                  {isDisabled ? (
                    <p className="text-[10px] text-white/45">Coming soon</p>
                  ) : (
                    <p className="text-[10px] text-[#22c55e]">{country.currency}</p>
                  )}
                </div>
                {isSelected ? <Check size={16} className="shrink-0 text-[#22c55e]" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
