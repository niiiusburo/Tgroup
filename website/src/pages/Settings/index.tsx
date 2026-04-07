/**
 * Settings Page — tabbed settings for service catalog, roles, customer sources, and system preferences
 * @crossref:route[/settings]
 * @crossref:used-in[App]
 * @crossref:uses[ServiceCatalogSettings, RoleConfig, CustomerSourcesConfig, SystemPreferences]
 */

import { useState } from 'react';
import { Settings as SettingsIcon, Stethoscope, SlidersHorizontal } from 'lucide-react';
import { ServiceCatalogSettings } from '@/components/settings/ServiceCatalogSettings';
import { SystemPreferences } from '@/components/settings/SystemPreferences';

type SettingsTab = 'catalog' | 'preferences';

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'catalog', label: 'Service Catalog', icon: <Stethoscope className="w-4 h-4" />, description: 'Treatment types and pricing' },
  { id: 'preferences', label: 'System Preferences', icon: <SlidersHorizontal className="w-4 h-4" />, description: 'General app settings' },
];

const TAB_COMPONENTS: Record<SettingsTab, React.ComponentType> = {
  catalog: ServiceCatalogSettings,
  preferences: SystemPreferences,
};

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('catalog');

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <SettingsIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Configure your clinic preferences and system settings</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="bg-white rounded-xl shadow-card p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab description */}
      <div className="text-sm text-gray-500">
        {TABS.find((t) => t.id === activeTab)?.description}
      </div>

      {/* Active tab content */}
      <ActiveComponent />
    </div>
  );
}
