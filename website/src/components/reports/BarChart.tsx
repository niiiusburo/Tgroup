import { motion } from 'framer-motion';

interface BarChartProps {
  data: { label: string; value: number }[];
  formatValue?: (v: number) => string;
  color?: string;
  height?: number;
  showValues?: boolean;
}

const COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-lime-500', 'bg-red-500'];

export function BarChart({ data, formatValue, color, height = 200, showValues = true }: BarChartProps) {
  if (!data.length) return <div className="flex items-center justify-center text-gray-400 text-sm py-8">No data</div>;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const fmt = formatValue || ((v: number) => v.toLocaleString('vi-VN'));

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          {showValues && (
            <span className="text-[10px] text-gray-500 truncate w-full text-center">{fmt(d.value)}</span>
          )}
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: i * 0.03 }}
            style={{ transformOrigin: 'bottom', height: `${(d.value / maxVal) * 100}%` }}
            className={`w-full rounded-t ${color || COLORS[i % COLORS.length]} relative group cursor-default min-h-[4px]`}
          >
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors duration-150 rounded-t" />
          </motion.div>
          <span className="text-[10px] text-gray-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Horizontal bar list — ranked items with bars */
interface HorizontalBarListProps {
  items: { label: string; value: number; extra?: string }[];
  formatValue?: (v: number) => string;
  color?: string;
  maxItems?: number;
}

export function HorizontalBarList({ items, formatValue, color = 'bg-blue-500', maxItems = 10 }: HorizontalBarListProps) {
  const shown = items.slice(0, maxItems);
  if (!shown.length) return <div className="text-gray-400 text-sm py-4">No data</div>;
  const maxVal = Math.max(...shown.map(i => i.value), 1);
  const fmt = formatValue || ((v: number) => v.toLocaleString('vi-VN'));

  return (
    <div className="space-y-3">
      {shown.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1], delay: i * 0.03 }}
          className="group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-700 truncate max-w-[60%]">{item.label}</span>
            <span className="text-sm font-medium text-gray-900">{fmt(item.value)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / maxVal) * 100}%` }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: i * 0.04 }}
              className={`h-full rounded-full ${color}`}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
