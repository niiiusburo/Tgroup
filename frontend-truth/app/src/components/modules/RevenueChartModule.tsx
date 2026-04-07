import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { RevenueData } from '@/types';
import { fadeInUp } from '@/lib/animation';

export interface RevenueChartModuleProps {
  data?: RevenueData[];
  totalRevenue?: string;
  changePercent?: number;
}

const defaultData: RevenueData[] = [
  { month: 'Jan', fashion: 2400, electronics: 3200 },
  { month: 'Feb', fashion: 2800, electronics: 3500 },
  { month: 'Mar', fashion: 2200, electronics: 3000 },
  { month: 'Apr', fashion: 3200, electronics: 4100 },
  { month: 'May', fashion: 2166, electronics: 2644 },
  { month: 'Jun', fashion: 2900, electronics: 3800 },
  { month: 'Jul', fashion: 3100, electronics: 4200 },
  { month: 'Aug', fashion: 2800, electronics: 3900 },
  { month: 'Sept', fashion: 3300, electronics: 4500 },
  { month: 'Oct', fashion: 3600, electronics: 4800 },
  { month: 'Nov', fashion: 3400, electronics: 4600 },
  { month: 'Dec', fashion: 3800, electronics: 5200 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900 text-white p-3 rounded-lg shadow-lg"
      >
        <p className="text-xs text-gray-400 mb-2">{label} 2024</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm capitalize">{entry.name}:</span>
            <span className="text-sm font-semibold">
              ${entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </motion.div>
    );
  }
  return null;
};

export function RevenueChartModule({
  data = defaultData,
  totalRevenue = '$75,490',
  changePercent = 9,
}: RevenueChartModuleProps) {
  const fashionTotal = data.reduce((sum, d) => sum + d.fashion, 0);
  const electronicsTotal = data.reduce((sum, d) => sum + d.electronics, 0);

  return (
    <motion.div
      className="bg-white rounded-2xl p-6 shadow-card"
      initial={fadeInUp.initial}
      animate={fadeInUp.animate}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
      whileHover={{ boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold text-gray-900">
              Product Revenue
            </h2>
            <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-xs text-gray-500">?</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-gray-900">
              {totalRevenue}
            </span>
            <span className="flex items-center gap-1 text-sm font-medium text-green-500">
              <TrendingUp className="w-4 h-4" />
              +{changePercent}%
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm text-gray-600">Fashion</span>
            <span className="text-sm font-semibold text-gray-900">
              ${fashionTotal.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-200" />
            <span className="text-sm text-gray-600">Electronics</span>
            <span className="text-sm font-semibold text-gray-900">
              ${electronicsTotal.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            barGap={4}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E5E7EB"
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickFormatter={(value) => `$${value / 1000}K`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6' }} />
            <Bar
              dataKey="fashion"
              name="fashion"
              fill="#F97316"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              animationDuration={1000}
              animationBegin={200}
            />
            <Bar
              dataKey="electronics"
              name="electronics"
              fill="#FED7AA"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              animationDuration={1000}
              animationBegin={300}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

export default RevenueChartModule;
