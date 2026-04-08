/**
 * Settings Page — System settings with IP Access Control
 * @crossref:route[/settings]
 * @crossref:used-in[App]
 * @crossref:uses[SystemPreferences, IpAccessControl]
 */

import { useState } from 'react';
import { Settings as SettingsIcon, SlidersHorizontal, Shield } from 'lucide-react';
import { SystemPreferencesContent } from '@/components/settings/SystemPreferencesContent';
import { IpAccessControl } from '@/components/settings/IpAccessControl';
import { TimezoneSelector } from '@/components/settings/TimezoneSelector';

type SettingsTab = 'system' | 'ip';

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'system', label: 'System Setting', icon: <SlidersHorizontal className="w-4 h-4" /> },
  { id: 'ip', label: 'IP', icon: <Shield className="w-4 h-4" /> },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('system');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <SettingsIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Configure your clinic system settings, timezone, and IP access control</p>
        </div>
      </div>

      {/* Timezone Selector */}
      <TimezoneSelector />

      {/* Main pill-style tab navigation */}
      <div className="flex justify-center">
        <div 
          className="inline-flex bg-gray-100 rounded-full p-1" 
          role="tablist"
        >
          {TABS.map((tab, index) => {
            const isFirst = index === 0;
            const isLast = index === TABS.length - 1;
            
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-8 py-3 text-sm font-medium whitespace-nowrap transition-all
                  ${activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
                style={{
                  borderRadius: isFirst ? '9999px 0 0 9999px' : isLast ? '0 9999px 9999px 0' : '0',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'system' && <SystemPreferencesContent />}
      {activeTab === 'ip' && <IpAccessControl />}
    </div>
  );
}
