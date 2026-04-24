/**
 * TabNav — Shared tab navigation component
 * Replaces duplicated TABS.map patterns across 5+ pages.
 * @crossref:used-in[Reports, Settings, Payment, Relationships, Website]
 */
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  disabled?: boolean;
}

export interface TabNavProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'default' | 'compact';
  className?: string;
}

export function TabNav({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  className,
}: TabNavProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b border-gray-200',
        variant === 'compact' ? 'gap-1' : 'gap-2',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium',
              'border-b-2 transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              tab.disabled && 'opacity-50 cursor-not-allowed hover:border-transparent',
              variant === 'compact' && 'px-3 py-2'
            )}
            aria-selected={isActive}
            role="tab"
          >
            {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={cn(
                  'ml-1 px-2 py-0.5 text-xs rounded-full',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'bg-gray-100 text-gray-600'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
