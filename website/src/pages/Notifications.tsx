/**
 * Notifications Page — Placeholder for SMS/Email notification management
 * @crossref:route[/notifications]
 * @crossref:used-in[App]
 * @crossref:uses[Payment, Customers]
 */

import { Bell, Mail, MessageSquare, Send } from 'lucide-react';

export function Notifications() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">SMS and email notification management</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm">
          New Template
        </button>
      </div>

      {/* Channel cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Email Notifications', sent: '1,240', icon: Mail, color: '#0EA5E9', status: 'Active' },
          { label: 'SMS Notifications', sent: '856', icon: MessageSquare, color: '#10B981', status: 'Active' },
          { label: 'Push Notifications', sent: '—', icon: Send, color: '#8B5CF6', status: 'Coming Soon' },
        ].map((channel) => (
          <div key={channel.label} className="bg-white rounded-xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${channel.color}15` }}
              >
                <channel.icon className="w-5 h-5" style={{ color: channel.color }} />
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                channel.status === 'Active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {channel.status}
              </span>
            </div>
            <div className="font-medium text-gray-900 text-sm">{channel.label}</div>
            <div className="text-xs text-gray-400 mt-1">
              {channel.sent !== '—' ? `${channel.sent} sent this month` : 'Not configured'}
            </div>
          </div>
        ))}
      </div>

      {/* Notification templates placeholder */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Notification Templates</h3>
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
              className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
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
        <p className="text-gray-500 font-medium">Full notification management coming soon</p>
        <p className="text-sm text-gray-400 mt-1">
          Automated workflows for appointment reminders, payment alerts, and customer engagement
        </p>
      </div>
    </div>
  );
}
