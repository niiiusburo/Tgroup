import {
  CalendarPlus,
  UserPlus,
  CreditCard,
  Stethoscope,
  BarChart3,
} from 'lucide-react';
import { QUICK_ACTIONS } from '@/data/mockDashboard';

/**
 * QuickActionsBar - Buttons for common clinic actions
 * @crossref:used-in[Overview, Sidebar]
 */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  CalendarPlus,
  UserPlus,
  CreditCard,
  Stethoscope,
  BarChart3,
};

interface QuickActionsBarProps {
  readonly onAction?: (actionId: string) => void;
}

export function QuickActionsBar({ onAction }: QuickActionsBarProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-card">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Quick Actions
      </h3>
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = ICON_MAP[action.icon];
          return (
            <button
              key={action.id}
              onClick={() => onAction?.(action.id)}
              className="
                flex items-center gap-2 px-4 py-2.5 rounded-lg
                bg-primary/5 text-primary hover:bg-primary/10
                transition-colors duration-150 text-sm font-medium
              "
            >
              {Icon && <Icon className="w-4 h-4" />}
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
