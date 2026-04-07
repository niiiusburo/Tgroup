import { motion } from 'framer-motion';
import {
  Clock,
  Package,
  Percent,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { fadeInUp } from '@/lib/animation';

export interface StatCardModuleProps {
  title?: string;
  value?: string;
  change?: number;
  icon?: 'clock' | 'package' | 'percent';
  chartType?: 'bar' | 'donut' | 'line';
  delay?: number;
}

const iconMap = {
  clock: Clock,
  package: Package,
  percent: Percent,
};

const barData = [
  { value: 30 },
  { value: 45 },
  { value: 35 },
  { value: 50 },
  { value: 40 },
  { value: 55 },
  { value: 45 },
];

const lineData = [
  { value: 20 },
  { value: 35 },
  { value: 30 },
  { value: 45 },
  { value: 40 },
  { value: 55 },
  { value: 50 },
];

const donutData = [
  { name: 'Fashion', value: 60 },
  { name: 'Electronics', value: 40 },
];

const DONUT_COLORS = ['#F97316', '#FED7AA'];

export function StatCardModule({
  title = 'Active Sales',
  value = '$24,064',
  change = 12,
  icon = 'clock',
  chartType = 'bar',
  delay = 0,
}: StatCardModuleProps) {
  const Icon = iconMap[icon];
  const isPositive = change >= 0;

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <Bar
                dataKey="value"
                fill="#F97316"
                radius={[2, 2, 0, 0]}
                maxBarSize={8}
                animationDuration={800}
                animationBegin={delay * 1000 + 300}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#F97316"
                strokeWidth={2}
                dot={false}
                animationDuration={800}
                animationBegin={delay * 1000 + 300}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={20}
                outerRadius={32}
                paddingAngle={2}
                dataKey="value"
                animationDuration={800}
                animationBegin={delay * 1000 + 300}
              >
                {donutData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      className="bg-white rounded-2xl p-5 shadow-card"
      initial={fadeInUp.initial}
      animate={fadeInUp.animate}
      transition={{ ...fadeInUp.transition, delay: 0.25 + delay }}
      whileHover={{
        scale: 1.01,
        boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-900">{value}</span>
              <span
                className={`flex items-center gap-0.5 text-xs font-medium ${
                  isPositive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {isPositive ? '+' : ''}
                {change}%
              </span>
            </div>
          </div>
        </div>

        {/* Mini Chart */}
        <div className="w-20 h-12">{renderChart()}</div>
      </div>

      {/* Footer */}
      <motion.button
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors duration-150 group"
        whileHover={{ x: 2 }}
      >
        See Details
        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
      </motion.button>
    </motion.div>
  );
}

export default StatCardModule;
