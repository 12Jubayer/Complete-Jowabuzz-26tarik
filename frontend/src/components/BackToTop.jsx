import { useEffect, useState } from 'react';
import { colors } from '../config/theme';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Back to top"
      className="jb-back-to-top fixed z-40 flex items-center justify-center lg:hidden"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 5L5 14H19L12 5Z"
          fill={colors.mainBg}
        />
      </svg>
    </button>
  );
}
