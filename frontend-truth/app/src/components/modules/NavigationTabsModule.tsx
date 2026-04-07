import { motion } from 'framer-motion';
import { Plus, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TabType } from '@/types';
import { fadeInUp } from '@/lib/animation';

export interface NavigationTabsModuleProps {
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sales', label: 'Sales' },
  { id: 'order', label: 'Order' },
];

export function NavigationTabsModule({
  activeTab = 'overview',
  onTabChange,
}: NavigationTabsModuleProps) {
  return (
    <motion.div
      className="flex items-center justify-between mb-6"
      initial={fadeInUp.initial}
      animate={fadeInUp.animate}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
    >
      {/* Left: Tabs and Add Widget */}
      <div className="flex items-center gap-6">
        <nav className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`relative px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tabBackground"
                  className="absolute inset-0 bg-white rounded-md shadow-sm"
                  transition={{ type: 'spring', duration: 0.5 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </nav>

        <Button
          variant="ghost"
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <Plus className="w-4 h-4" />
          Add Widget
        </Button>
      </div>

      {/* Right: Filter and Export */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="flex items-center gap-2 text-sm font-medium text-gray-600 border-gray-200 hover:bg-gray-50"
        >
          <Filter className="w-4 h-4" />
          Filter
        </Button>
        <Button
          variant="default"
          className="flex items-center gap-2 text-sm font-medium bg-gray-900 hover:bg-gray-800 text-white"
        >
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>
    </motion.div>
  );
}

export default NavigationTabsModule;
