export default function GameGridSkeleton({ count = 16 }) {
  return (
    <div className="jb-game-grid grid grid-cols-4 lg:grid-cols-8 gap-2 lg:gap-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="jb-game-card-skeleton">
          <div className="jb-game-card-skeleton__media jb-category-provider-card__shimmer" />
          <div className="jb-game-card-skeleton__title jb-category-provider-card__shimmer" />
        </div>
      ))}
    </div>
  );
}
