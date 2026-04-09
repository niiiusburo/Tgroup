/**
 * System Preferences — general app settings with nested tabs for IP Access
 * @crossref:used-in[Settings]
 * @crossref:uses[useSystemPreferences, IpAccessControl]
 */

import { useState } from 'react';
import { ToggleLeft, ToggleRight, SlidersHorizontal, Shield } from 'lucide-react';
import { useSystemPreferences } from '@/hooks/useSettings';
import { IpAccessControl } from './IpAccessControl';

type SystemPrefsTab = 'general' | 'ipaccess';

const SUB_TABS: { id: SystemPrefsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'System Setting', icon: <SlidersHorizontal className="w-4 h-4" /> },
  { id: 'ipaccess', label: 'IP', icon: <Shield className="w-4 h-4" /> },
];

export function SystemPreferences() {
  const { groups, updatePreference } = useSystemPreferences();
  const [activeTab, setActiveTab] = useState<SystemPrefsTab>('general');

  return (
    <div className="space-y-6">
      {/* Pill-style Sub-tab navigation */}
      <div className="flex justify-center">
        <div 
          className="inline-flex bg-gray-100 rounded-full p-1" 
          role="tablist"
          style={{ borderRadius: '9999px' }}
        >
          {SUB_TABS.map((tab, index) => {
            const isFirst = index === 0;
            const isLast = index === SUB_TABS.length - 1;
            
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-2.5 text-sm font-medium whitespace-nowrap transition-all
                  ${isFirst ? 'rounded-l-full' : ''}
                  ${isLast ? 'rounded-r-full' : ''}
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
      {activeTab === 'general' && (
        <div className="space-y-6">
          {Object.entries(groups).map(([groupName, prefs]) => (
            <div key={groupName} className="bg-white rounded-xl shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-semibold text-gray-900">{groupName}</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {prefs.map((pref) => (
                  <div key={pref.key} className="px-4 py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{pref.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{pref.description}</div>
                    </div>
                    <div className="shrink-0">
                      {pref.type === 'toggle' && (
                        <button
                          type="button"
                          onClick={() => updatePreference(pref.key, !pref.value)}
                        >
                          {pref.value ? (
                            <ToggleRight className="w-8 h-8 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-gray-400" />
                          )}
                        </button>
                      )}
                      {pref.type === 'select' && pref.options && (
                        <select
                          value={String(pref.value)}
                          onChange={(e) => updatePreference(pref.key, e.target.value)}
                          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white"
                        >
                          {pref.options.map((opt, idx) => {
                            const optValue = typeof opt === 'string' ? opt : opt.value;
                            const optLabel = typeof opt === 'string' ? opt : opt.label;
                            return <option key={idx} value={optValue}>{optLabel}</option>;
                          })}
                        </select>
                      )}
                      {pref.type === 'text' && (
                        <input
                          type="text"
                          value={String(pref.value)}
                          onChange={(e) => updatePreference(pref.key, e.target.value)}
                          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary w-48"
                        />
                      )}
                      {pref.type === 'number' && (
                        <input
                          type="number"
                          value={Number(pref.value)}
                          onChange={(e) => updatePreference(pref.key, parseInt(e.target.value, 10) || 0)}
                          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary w-24 text-right"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'ipaccess' && <IpAccessControl />}
    </div>
  );
}
