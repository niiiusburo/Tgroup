/**
 * Settings Page — System settings with IP Access Control
 * @crossref:route[/settings]
 * @crossref:used-in[App]
 * @crossref:uses[SystemPreferences, IpAccessControl]
 */

import { useState } from 'react';
import { Settings as SettingsIcon, SlidersHorizontal, Shield, Globe, Building2 } from 'lucide-react';
import { SystemPreferencesContent } from '@/components/settings/SystemPreferencesContent';
import { IpAccessControl } from '@/components/settings/IpAccessControl';
import { TimezoneSelector } from '@/components/settings/TimezoneSelector';
import { BankSettingsForm } from '@/components/settings/BankSettingsForm';

type SettingsTab = 'system' | 'bank' | 'ip';

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'system', label: 'System Settings', icon: <SlidersHorizontal className="w-5 h-5" /> },
  { id: 'bank', label: 'Bank Account', icon: <Building2 className="w-5 h-5" /> },
  { id: 'ip', label: 'IP Access Control', icon: <Shield className="w-5 h-5" /> },
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

      {/* Timezone Selector - Prominent at top */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-xl border border-primary/20 overflow-hidden">
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Timezone Setting</h3>
              <p className="text-sm text-gray-500">Configure your clinic's timezone for all date and time displays</p>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4">
            <TimezoneSelector compact />
          </div>
        </div>
      </div>

      {/* Main tab navigation - Styled with website color */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        {/* Tab header with primary color background */}
        <div className="bg-gradient-to-r from-primary to-primary/90 px-6 py-1">
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-8 py-3 text-sm font-medium whitespace-nowrap transition-all
                  rounded-t-lg border-b-2
                  ${activeTab === tab.id
                    ? 'bg-white text-primary border-white shadow-sm'
                    : 'bg-primary/20 text-white/90 border-transparent hover:bg-primary/30 hover:text-white'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content area */}
        <div className="p-6">
          {activeTab === 'system' && <SystemPreferencesContent />}
          {activeTab === 'bank' && <BankSettingsForm />}
          {activeTab === 'ip' && <IpAccessControl />}
        </div>
      </div>
    </div>
  );
}
