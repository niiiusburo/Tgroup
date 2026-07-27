/**
 * Settings Page — System settings with IP Access Control
 * @crossref:route[/settings]
 * @crossref:used-in[App]
 * @crossref:uses[SystemPreferences, IpAccessControl, CustomerSourcesConfig]
 */

import { useState } from 'react';
import {
  Settings as SettingsIcon,
  SlidersHorizontal,
  Shield,
  Globe,
  Building2,
  MessageSquare,
  Users,
} from 'lucide-react';
import { SystemPreferencesContent } from '@/components/settings/SystemPreferencesContent';
import { PageHeader } from '@/components/shared/PageHeader';
import { IpAccessControl } from '@/components/settings/IpAccessControl';
import { TimezoneSelector } from '@/components/settings/TimezoneSelector';
import { BankSettingsForm } from '@/components/settings/BankSettingsForm';
import { FeedbackAdminContent } from '@/components/settings/FeedbackAdminContent';
import { CustomerSourcesConfig } from '@/components/settings/CustomerSourcesConfig';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

type SettingsTab = 'system' | 'sources' | 'bank' | 'ip' | 'feedback';

const ALL_TABS: { id: SettingsTab; labelKey: string; icon: React.ReactNode; admin?: boolean }[] = [
  { id: 'system', labelKey: 'tabs.system', icon: <SlidersHorizontal className="w-5 h-5" /> },
  { id: 'sources', labelKey: 'tabs.sources', icon: <Users className="w-5 h-5" /> },
  { id: 'bank', labelKey: 'tabs.bank', icon: <Building2 className="w-5 h-5" /> },
  { id: 'ip', labelKey: 'tabs.ip', icon: <Shield className="w-5 h-5" /> },
  { id: 'feedback', labelKey: 'tabs.feedback', icon: <MessageSquare className="w-5 h-5" />, admin: true },
];

export function Settings() {
  const { t } = useTranslation('settings');
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission('permissions.view');
  const canEditSettings = hasPermission('settings.edit');
  const canEditFeedback = hasPermission('permissions.edit');
  const TABS = ALL_TABS.filter((tab) => !tab.admin || isAdmin);
  const [activeTab, setActiveTab] = useState<SettingsTab>('system');

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        icon={<SettingsIcon className="w-6 h-6 text-primary" />}
      />

      <div className="bg-primary/5 rounded-xl border border-primary/20 overflow-hidden">
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">{t('timezoneSetting')}</h3>
              <p className="text-sm text-gray-500">{t('timezoneDesc')}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4">
            <TimezoneSelector compact />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="bg-primary px-6 py-1">
          <div className="flex gap-1 overflow-x-auto">
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
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'system' && <SystemPreferencesContent canEdit={canEditSettings} />}
          {activeTab === 'sources' && <CustomerSourcesConfig />}
          {activeTab === 'bank' && <BankSettingsForm canEdit={canEditSettings} />}
          {activeTab === 'ip' && <IpAccessControl canEdit={canEditSettings} />}
          {activeTab === 'feedback' && <FeedbackAdminContent canEdit={canEditFeedback} />}
        </div>
      </div>
    </div>
  );
}
