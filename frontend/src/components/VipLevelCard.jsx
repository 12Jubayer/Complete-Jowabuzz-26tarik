function CrownIcon({ color }) {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 18H20L18 8L14 11L12 5L10 11L6 8L4 18Z"
        fill={color}
        stroke={color}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendIcon({ color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 18H20M7 14L11 10L14 13L18 8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BenefitRow({ label, value }) {
  return (
    <div className="vip-level-card__benefit-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function VipLevelCard({ level }) {
  return (
    <article
      className="vip-level-card"
      style={{
        background: level.gradient,
        borderColor: level.border,
        boxShadow: `0 0 28px ${level.glow}`,
      }}
    >
      <div
        className="vip-level-card__crown"
        style={{ color: level.accent, filter: `drop-shadow(0 0 10px ${level.glow})` }}
      >
        <CrownIcon color={level.accent} />
      </div>

      <h3 className="vip-level-card__name" style={{ color: level.accent }}>
        {level.name}
      </h3>
      <p className="vip-level-card__level">VIP LEVEL {level.level}</p>

      <div className="vip-level-card__exp-box">
        <div className="vip-level-card__exp-label">
          <TrendIcon color={level.accent} />
          <span>EXP REQUIRED</span>
        </div>
        <p className="vip-level-card__exp-value">{level.expRequired}</p>
      </div>

      <div className="vip-level-card__rewards">
        <p className="vip-level-card__rewards-title">REWARDS &amp; BENEFITS</p>
        <BenefitRow label="Level-Up Bonus" value={level.levelUpBonus} />
        <BenefitRow label="Monthly Reward" value={level.monthlyReward} />
        <BenefitRow label="Safe Cashback" value={level.safeCashback} />
        <BenefitRow label="Rebate" value={level.rebate} />
      </div>
    </article>
  );
}
