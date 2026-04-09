/**
 * System Preferences Content — general app settings without tab navigation
 * @crossref:used-in[Settings]
 * @crossref:uses[useSystemPreferences]
 */

import { ToggleLeft, ToggleRight } from 'lucide-react';
import { useSystemPreferences } from '@/hooks/useSettings';

export function SystemPreferencesContent() {
  const { groups, updatePreference } = useSystemPreferences();

  return (
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
  );
}
