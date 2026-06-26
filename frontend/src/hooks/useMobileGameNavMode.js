import { useEffect, useState } from 'react';

const COMPACT_THRESHOLD = 96;

export default function useMobileGameNavMode(gameGridRef) {
  const [mode, setMode] = useState('icon');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const resolveGrid = () => gameGridRef?.current || document.getElementById('game-grid-section');

    const updateMode = () => {
      if (window.innerWidth >= 1024) {
        setMode('icon');
        return;
      }

      const grid = resolveGrid();
      if (!grid) {
        setMode('icon');
        return;
      }

      const rect = grid.getBoundingClientRect();
      setMode(rect.bottom <= COMPACT_THRESHOLD ? 'compact' : 'icon');
    };

    updateMode();
    window.addEventListener('scroll', updateMode, { passive: true });
    window.addEventListener('resize', updateMode);

    return () => {
      window.removeEventListener('scroll', updateMode);
      window.removeEventListener('resize', updateMode);
    };
  }, [gameGridRef]);

  return mode;
}
