export default function ProviderGridSkeleton({ count = 12 }) {
  return (
    <div className="jb-category-provider-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="jb-category-provider-card jb-category-provider-card--skeleton">
          <div className="jb-category-provider-card__logo-wrap jb-category-provider-card__shimmer" />
          <div className="jb-category-provider-card__name jb-category-provider-card__shimmer" />
        </div>
      ))}
    </div>
  );
}
