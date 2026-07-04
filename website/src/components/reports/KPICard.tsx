import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardBreakdown {
  label: string;
  value: number;
  tone?: 'positive' | 'pending' | 'neutral';
}

interface KPICardProps {
  label: string;
  value: number;
  format?: 'currency' | 'number' | 'percent';
  change?: number | null;
  icon: React.ReactNode;
  color: string;
  delay?: number;
  breakdown?: KPICardBreakdown[];
}

function formatValue(val: number, format: string): string {
  if (format === 'currency') return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
  if (format === 'percent') return val.toFixed(1) + '%';
  return new Intl.NumberFormat('vi-VN').format(val);
}

function CountUp({ target, format, delay = 0 }: { target: number; format: string; delay?: number }) {
  const spring = useSpring(0, { stiffness: 100, damping: 20 });
  const display = useTransform(spring, (v) => formatValue(v, format));

  useEffect(() => {
    const timer = setTimeout(() => spring.set(target), delay * 1000);
    return () => clearTimeout(timer);
  }, [target, spring, delay]);

  return <motion.span>{display}</motion.span>;
}

export function KPICard({ label, value, format = 'number', change, icon, color, delay = 0, breakdown }: KPICardProps) {
  const isPositive = change !== null && change !== undefined && change > 0;
  const isNegative = change !== null && change !== undefined && change < 0;
  const isFlat = change === 0;

  const colorMap: Record<string, { bg: string; iconBg: string; iconText: string }> = {
    blue:     { bg: 'bg-blue-50',     iconBg: 'bg-blue-100',     iconText: 'text-blue-600' },
    emerald:  { bg: 'bg-emerald-50',  iconBg: 'bg-emerald-100',  iconText: 'text-emerald-600' },
    amber:    { bg: 'bg-amber-50',    iconBg: 'bg-amber-100',    iconText: 'text-amber-600' },
    violet:   { bg: 'bg-violet-50',   iconBg: 'bg-violet-100',   iconText: 'text-violet-600' },
    rose:     { bg: 'bg-rose-50',     iconBg: 'bg-rose-100',     iconText: 'text-rose-600' },
    cyan:     { bg: 'bg-cyan-50',     iconBg: 'bg-cyan-100',     iconText: 'text-cyan-600' },
    orange:   { bg: 'bg-orange-50',   iconBg: 'bg-orange-100',   iconText: 'text-orange-600' },
    pink:     { bg: 'bg-pink-50',     iconBg: 'bg-pink-100',     iconText: 'text-pink-600' },
    red:      { bg: 'bg-red-50',      iconBg: 'bg-red-100',      iconText: 'text-red-600' },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: delay * 0.05 }}
      className={`${c.bg} rounded-xl p-5 relative overflow-hidden group`}
    >
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/30 transition-colors duration-150" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-gray-500">{label}</span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.iconBg}`}>
            <span className={c.iconText}>{icon}</span>
          </div>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          <CountUp target={value} format={format} delay={delay * 0.05} />
        </div>
        {change !== null && change !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
            isPositive ? 'text-emerald-600' : isNegative ? 'text-red-500' : 'text-gray-400'
          }`}>
            {isPositive && <TrendingUp className="w-3 h-3" />}
            {isNegative && <TrendingDown className="w-3 h-3" />}
            {isFlat && <Minus className="w-3 h-3" />}
            {change > 0 ? '+' : ''}{change?.toFixed(1)}% vs prev period
          </div>
        )}
        {breakdown && breakdown.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] leading-tight" data-testid="kpi-breakdown">
            {breakdown.map((item, idx) => {
              const toneClass =
                item.tone === 'positive' ? 'text-emerald-700' :
                item.tone === 'pending'  ? 'text-amber-700' :
                'text-gray-600';
              return (
                <div key={idx} className="flex flex-col">
                  <span className="text-gray-500">{item.label}</span>
                  <span className={`font-semibold tabular-nums ${toneClass}`}>
                    {formatValue(item.value, format)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
