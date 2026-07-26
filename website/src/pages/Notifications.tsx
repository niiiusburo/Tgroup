/**
 * Notifications Page — static placeholder for SMS/Email notification management.
 *
 * NOTHING ON THIS PAGE IS WIRED TO A BACKEND. There is no notifications API, no
 * notification table, and no send path. Every card, template row, and count below is
 * hardcoded in this file.
 *
 * It previously rendered invented telemetry — "1,240 sent this month", "856 sent this
 * month", and two channels badged "Active" — which read to clinic staff as a live,
 * working integration. Those numbers were removed rather than kept, because a
 * placeholder that reports fake sends is worse than an obviously empty one.
 *
 * If you wire this up, delete the hardcoded arrays; do not backfill them with plausible
 * numbers.
 *
 * @crossref:route[/notifications]
 * @crossref:used-in[App]
 * @crossref:uses[Payment, Customers]
 */

import { Bell, Info, Mail, MessageSquare, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/PageHeader';

export function Notifications() {
  const { t } = useTranslation('common');
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('notifications', { ns: 'nav' })}
        subtitle={t('notifications:subtitle')}
        icon={<Bell className="w-6 h-6 text-primary" />}
        actions={
          <button
            disabled
            title={t('notifications:newTemplateDisabled')}
            className="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg text-sm cursor-not-allowed"
          >
            New Template
          </button>
        }
      />

      {/* States plainly that nothing here is live, before any of the cards are read. */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800">{t('notifications:previewBanner')}</p>
      </div>

      {/* Channel cards — no channel is configured, so none reports a status or a count */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Email Notifications', icon: Mail, color: '#0EA5E9' },
          { label: 'SMS Notifications', icon: MessageSquare, color: '#10B981' },
          { label: 'Push Notifications', icon: Send, color: '#8B5CF6' },
        ].map((channel) => (
          <div key={channel.label} className="bg-white rounded-xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${channel.color}15` }}
              >
                <channel.icon className="w-5 h-5" style={{ color: channel.color }} />
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {t('notifications:notConfigured')}
              </span>
            </div>
            <div className="font-medium text-gray-900 text-sm">{channel.label}</div>
            <div className="text-xs text-gray-400 mt-1">{t('notifications:notConfigured')}</div>
          </div>
        ))}
      </div>

      {/* Notification templates placeholder */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">{t('notifications:notificationTemplates')}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{t('notifications:templatesArePlanned')}</p>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { name: 'Appointment Reminder', channel: 'SMS + Email', trigger: '24h before appointment' },
            { name: 'Payment Confirmation', channel: 'Email', trigger: 'After payment processed' },
            { name: 'Follow-up Care', channel: 'Email', trigger: '7 days after treatment' },
            { name: 'Payment Overdue', channel: 'SMS', trigger: 'Payment due date passed' },
            { name: 'Birthday Greeting', channel: 'Email', trigger: 'Customer birthday' },
          ].map((tpl) => (
            <div
              key={tpl.name}
              className="p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-sm text-gray-900">{tpl.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{tpl.trigger}</div>
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-600">
                {tpl.channel}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Coming soon section */}
      <div className="bg-white rounded-xl shadow-card p-12 text-center">
        <Bell className="w-12 h-12 mx-auto mb-3 text-gray-200" />
        <p className="text-gray-500 font-medium">{t('notifications:comingSoon')}</p>
        <p className="text-sm text-gray-400 mt-1">
          Automated workflows for appointment reminders, payment alerts, and customer engagement
        </p>
      </div>
    </div>
  );
}
