import { uiConfig } from '../config/uiConfig';
import { colors } from '../config/theme';

export default function SectionTitle({
  title,
  showGlow = false,
  actionLabel,
  onAction,
}) {
  const mobile = uiConfig.mobile;

  return (
    <div className="mb-2 flex items-center justify-between gap-2 lg:mb-3 lg:gap-3">
      <div
        className={`inline-flex items-center rounded-md px-2 py-1 lg:px-3 lg:py-1.5 ${showGlow ? 'glow-green' : ''}`}
        style={{
          backgroundColor: showGlow ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
          borderLeft: `3px solid ${colors.green}`,
        }}
      >
        <h2
          className="jb-section-title__text font-bold uppercase tracking-wide lg:text-sm"
          style={{
            fontSize: mobile.sectionTitleSize,
          }}
        >
          {title}
        </h2>
      </div>

      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors duration-200 hover:border-jb-green lg:px-3 lg:py-1 lg:text-xs"
          style={{
            color: colors.textGray,
            borderColor: colors.border,
            height: uiConfig.buttonHeight * 0.7,
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
