import { motion } from 'framer-motion';

interface DonutChartProps {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
}

export function DonutChart({ segments, size = 160, strokeWidth = 24 }: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <div className="text-gray-400 text-sm py-4">No data</div>;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />

        {/* Segments */}
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dashLen = circumference * pct;
          const dashOffset = -offset * circumference;
          offset += pct;
          return (
            <motion.circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={dashOffset}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${dashLen} ${circumference - dashLen}` }}
              transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: i * 0.1 }}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="space-y-2 flex-1 min-w-0">
        {segments.map((seg) => {
          const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : '0';
          return (
            <div key={seg.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-sm text-gray-600 truncate flex-1">{seg.label}</span>
              <span className="text-sm font-medium text-gray-900">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Simple progress ring for a single value */
interface ProgressRingProps {
  value: number; // 0-100
  label: string;
  color?: string;
  size?: number;
}

export function ProgressRing({ value, label, color = '#3B82F6', size = 100 }: ProgressRingProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashLen = circumference * (Math.min(value, 100) / 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${dashLen} ${circumference - dashLen}` }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" textAnchor="middle" dy=".35em" className="text-lg font-bold" fill="#111827">
          {Number.isFinite(value) ? Math.round(value) : 0}%
        </text>
      </svg>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
