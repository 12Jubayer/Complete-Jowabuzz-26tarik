function getChartGeometry(data, width, height, padding) {
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxCount = Math.max(...data.map((item) => item.count), 1);
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0;

  const points = data.map((item, index) => {
    const x = padding.left + index * stepX;
    const y =
      padding.top +
      chartHeight -
      (item.count / maxCount) * chartHeight;
    return { x, y, count: item.count };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const baselineY = padding.top + chartHeight;

  return { points, linePath, baselineY, chartWidth, chartHeight, maxCount };
}

export default function AdminDashboardChart({ data = [] }) {
  const width = 920;
  const height = 280;
  const padding = { top: 24, right: 24, bottom: 42, left: 24 };
  const { points, linePath, baselineY } = getChartGeometry(data, width, height, padding);

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-slate-800">
          Daily Transactions (last 7 days)
        </h3>
        <span className="text-xs text-slate-400">count</span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[640px] w-full"
          role="img"
          aria-label="Daily transactions chart for the last 7 days"
        >
          <line
            x1={padding.left}
            y1={baselineY}
            x2={width - padding.right}
            y2={baselineY}
            stroke="#E5E7EB"
            strokeWidth="1"
          />

          <path
            d={linePath}
            fill="none"
            stroke="#00D094"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point, index) => (
            <g key={data[index]?.date ?? index}>
              <circle cx={point.x} cy={point.y} r="4" fill="#00D094" />
              <text
                x={point.x}
                y={height - 12}
                textAnchor="middle"
                className="fill-slate-400 text-[11px]"
              >
                {data[index]?.date}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
