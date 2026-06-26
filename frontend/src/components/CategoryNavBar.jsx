import { getCategoryLabel } from '../utils/categoryNavigation';

export default function CategoryNavBar({ title, subtitle, onBack, backLabel = 'Back' }) {
  if (!onBack) return null;

  return (
    <div className="jb-category-nav-bar mb-3 flex items-center gap-3">
      <button
        type="button"
        className="jb-category-nav-bar__back"
        onClick={onBack}
        aria-label={backLabel}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M15 18l-6-6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{backLabel}</span>
      </button>
      <div className="jb-category-nav-bar__titles min-w-0">
        <p className="jb-category-nav-bar__title truncate">{title}</p>
        {subtitle ? (
          <p className="jb-category-nav-bar__subtitle truncate">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

export { getCategoryLabel };
