import { uiConfig } from '../config/uiConfig';
import { colors } from '../config/theme';

export default function GameCard({
  title,
  image = '/images/game-placeholder.png',
  onClick,
  disabled = false,
}) {
  const cardWidth = uiConfig.gameCardWidth > 0 ? uiConfig.gameCardWidth : undefined;
  const mobile = uiConfig.mobile;

  return (
    <article
      className="jb-game-card group w-full min-w-0"
      style={cardWidth ? { width: cardWidth, maxWidth: cardWidth } : undefined}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || !onClick}
        className={`block w-full min-w-0 text-left ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div
          className="jb-game-card__media relative aspect-square w-full overflow-hidden border transition-transform duration-300 group-hover:scale-[1.02] lg:aspect-auto lg:rounded-lg"
          style={{
            borderRadius: mobile.gameCardRadius,
            backgroundColor: colors.cardBg,
            borderColor: colors.border,
          }}
        >
          <img
            src={image}
            alt={title}
            className="jb-game-card__image h-full w-full object-cover object-center"
          />

          <span
            className="absolute right-0 top-0 lg:hidden"
            aria-hidden="true"
            style={{
              width: 0,
              height: 0,
              borderTop: `14px solid ${colors.gold}`,
              borderLeft: '14px solid transparent',
            }}
          />

          <span
            className="absolute right-0 top-0 hidden rounded-bl-lg px-1.5 py-0.5 text-[9px] font-bold uppercase lg:block"
            style={{
              backgroundColor: colors.green,
              color: colors.textWhite,
            }}
          >
            Hot
          </span>
        </div>

        <p
          className="jb-game-card__title mt-1 truncate text-center font-medium leading-[14px] lg:mt-1.5 lg:text-[11px] lg:leading-normal"
          style={{
            fontSize: mobile.gameTitleSize,
          }}
          title={title}
        >
          {title}
        </p>
      </button>
    </article>
  );
}
