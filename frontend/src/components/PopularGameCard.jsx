export default function PopularGameCard({
  title,
  image,
  onClick,
  disabled = false,
}) {
  return (
    <article className="popular-game-card w-full min-w-0">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || !onClick}
        className="popular-game-card__button block w-full min-w-0 text-left"
      >
        <div className="popular-game-card__media">
          <img
            src={image}
            alt={title}
            className="popular-game-card__image"
            loading="lazy"
          />
        </div>
        <div className="popular-game-card__footer">
          <p className="popular-game-card__title" title={title}>
            {title}
          </p>
        </div>
      </button>
    </article>
  );
}
