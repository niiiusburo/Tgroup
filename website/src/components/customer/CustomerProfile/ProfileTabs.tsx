import { useTranslation } from 'react-i18next';
import { TabBadge } from './TabBadge';
import type { CustomerProfileTab, OrchestratorProps } from './types';

interface TabConfig {
  readonly value: CustomerProfileTab;
  readonly label: string;
  readonly getCount?: (props: OrchestratorProps) => number;
}

const TABS: readonly TabConfig[] = [
  { value: 'profile', label: 'profile' },
  { value: 'appointments', label: 'appointments', getCount: (p) => p.appointments.length },
  { value: 'records', label: 'records', getCount: (p) => p.services?.length ?? 0 },
  { value: 'payment', label: 'payment', getCount: (p) => p.payments?.length ?? 0 },
];

interface ProfileTabsProps {
  readonly activeTab: CustomerProfileTab;
  readonly props: OrchestratorProps;
  readonly loadingServices: boolean;
  readonly onSelect: (tab: CustomerProfileTab) => void;
}

export function ProfileTabs({ activeTab, props, loadingServices, onSelect }: ProfileTabsProps) {
  const { t } = useTranslation('customers');

  return (
    <div className="border-b border-gray-200 overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {TABS.map((tab) => {
          const count = tab.getCount?.(props) ?? 0;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onSelect(tab.value)}
              className={`group flex items-center px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t(tab.label)}
              {tab.getCount && (
                <TabBadge count={count} isActive={isActive} loading={tab.value === 'records' && loadingServices} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
