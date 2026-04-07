import { motion, useSpring, useTransform } from 'framer-motion';
import { Globe, TrendingUp } from 'lucide-react';
import { useEffect } from 'react';
import { fadeInUp } from '@/lib/animation';

export interface TotalVisitModuleProps {
  total?: number;
  mobile?: number;
  desktop?: number;
  changePercent?: number;
}

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { duration: 2000 });
  const display = useTransform(spring, (current) =>
    Math.floor(current).toLocaleString()
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
}

export function TotalVisitModule({
  total = 191886,
  mobile = 115132,
  desktop = 76754,
  changePercent = 8.5,
}: TotalVisitModuleProps) {
  const mobilePercent = Math.round((mobile / total) * 100);
  const desktopPercent = 100 - mobilePercent;

  return (
    <motion.div
      className="bg-white rounded-2xl p-6 shadow-card"
      initial={fadeInUp.initial}
      animate={fadeInUp.animate}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.35 }}
      whileHover={{
        scale: 1.01,
        boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Visit</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                <AnimatedNumber value={total} />
              </span>
              <span className="flex items-center gap-0.5 text-xs font-medium text-green-500">
                <TrendingUp className="w-3 h-3" />
                +{changePercent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Device Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Mobile</span>
            <span className="font-semibold text-gray-900">
              {mobile.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Desktop</span>
            <span className="font-semibold text-gray-900">
              {desktop.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-10 bg-orange-100 rounded-full overflow-hidden flex">
          <motion.div
            className="h-full bg-primary flex items-center justify-end pr-3"
            initial={{ width: 0 }}
            animate={{ width: `${mobilePercent}%` }}
            transition={{
              duration: 1,
              delay: 0.5,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            <span className="text-xs font-semibold text-white">
              {mobilePercent}%
            </span>
          </motion.div>
          <motion.div
            className="h-full bg-orange-200 flex items-center justify-end pr-3 flex-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <span className="text-xs font-semibold text-orange-700">
              {desktopPercent}%
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default TotalVisitModule;