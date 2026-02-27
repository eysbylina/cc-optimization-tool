"use client";

const COLORS = [
  "#1d9bf0",
  "#00ba7c",
  "#f4212e",
  "#ffad1f",
  "#7856ff",
  "#7fba00",
  "#f45d48",
  "#2d3a4d",
  "#e056a0",
  "#42d4f4",
];

interface Props {
  title: string;
  data: Record<string, number>;
}

export default function PieChart({ title, data }: Props) {
  const entries = Object.entries(data)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (total === 0) {
    return (
      <div className="bg-bg rounded-lg p-4 border border-border">
        <h3 className="text-sm font-semibold text-muted mb-2">{title}</h3>
        <p className="text-muted text-sm text-center py-8">No spend data</p>
      </div>
    );
  }

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  let startDeg = -90;
  const paths: React.ReactElement[] = [];

  entries.forEach(([, val], i) => {
    const angle = (val / total) * 360;
    const endDeg = startDeg + angle;
    const x1 = cx + r * Math.cos((startDeg * Math.PI) / 180);
    const y1 = cy + r * Math.sin((startDeg * Math.PI) / 180);
    const x2 = cx + r * Math.cos((endDeg * Math.PI) / 180);
    const y2 = cy + r * Math.sin((endDeg * Math.PI) / 180);
    const large = angle > 180 ? 1 : 0;
    const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`;
    paths.push(
      <path
        key={i}
        d={d}
        fill={COLORS[i % COLORS.length]}
        stroke="#1a2332"
        strokeWidth={1}
      />
    );
    startDeg = endDeg;
  });

  return (
    <div className="bg-bg rounded-lg p-4 border border-border">
      <h3 className="text-sm font-semibold text-muted mb-3">{title}</h3>
      <div className="flex items-center justify-center min-h-[220px]">
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          {paths}
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted">
        {entries.map(([cat, val], i) => (
          <span key={cat} className="inline-flex items-center gap-1.5">
            <i
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            {cat} ${val.toFixed(0)}
          </span>
        ))}
      </div>
    </div>
  );
}
