function getChartGeometry(data, width, height, padding, valueKey = 'amount') {
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.map((item) => Number(item[valueKey] || 0)), 1);
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0;

  const points = data.map((item, index) => {
    const x = padding.left + index * stepX;
    const y =
      padding.top + chartHeight - (Number(item[valueKey] || 0) / maxValue) * chartHeight;
    return { x, y, value: Number(item[valueKey] || 0), label: item.week || item.day || '' };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const baselineY = padding.top + chartHeight;

  return { points, linePath, baselineY, maxValue };
}

export default function AffiliateLineChart({
  title,
  data = [],
  valueKey = 'amount',
  stroke = '#7C3AED',
}) {
  const width = 640;
  const height = 240;
  const padding = { top: 20, right: 16, bottom: 36, left: 16 };
  const { points, linePath, baselineY } = getChartGeometry(data, width, height, padding, valueKey);

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
        <h3 className="text-sm font-semibold text-slate-800 sm:text-[15px]">{title}</h3>
      </div>

      {data.length === 0 ? (
        <div className="flex h-[180px] items-center justify-center text-sm text-slate-400 sm:h-[220px]">
          No chart data yet
        </div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" preserveAspectRatio="xMidYMid meet">
          <line
            x1={padding.left}
            y1={baselineY}
            x2={width - padding.right}
            y2={baselineY}
            stroke="#E5E7EB"
            strokeWidth="1"
          />
          <path d={linePath} fill="none" stroke={stroke} strokeWidth="2.5" />
          {points.map((point, index) => (
            <g key={index}>
              <circle cx={point.x} cy={point.y} r="4" fill={stroke} />
              <text
                x={point.x}
                y={baselineY + 18}
                textAnchor="middle"
                fontSize="10"
                fill="#94A3B8"
              >
                {String(point.label).slice(5)}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

export function AffiliateStatCard({ label, value, tone = 'violet' }) {
  const tones = {
    violet: 'text-violet-600',
    emerald: 'text-emerald-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 sm:text-[11px]">
        {label}
      </p>
      <p className={`mt-2 text-xl font-bold leading-none sm:text-[26px] ${tones[tone] || 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}
