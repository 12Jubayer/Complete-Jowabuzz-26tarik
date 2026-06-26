export default function InfoCard({ title, children, icon = 'info' }) {
  return (
    <div className="vip-info-card">
      <div className={`vip-info-card__icon vip-info-card__icon--${icon}`} aria-hidden="true">
        {icon === 'help' ? '?' : 'i'}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="vip-info-card__title">{title}</h3>
        <p className="vip-info-card__text">{children}</p>
      </div>
    </div>
  );
}
