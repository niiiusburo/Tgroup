import { Settings as SettingsIcon } from 'lucide-react';

/**
 * Settings Page
 * @crossref:route[/settings]
 * @crossref:used-in[App]
 */
export function Settings() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <SettingsIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Configure your clinic preferences</p>
        </div>
      </div>

      {/* Settings sections */}
      <div className="max-w-2xl space-y-4">
        {[
          { title: 'Clinic Information', desc: 'Name, address, contact details' },
          { title: 'Business Hours', desc: 'Operating hours and holidays' },
          { title: 'Notifications', desc: 'Email and SMS preferences' },
          { title: 'Integrations', desc: 'Connect third-party services' },
          { title: 'Billing', desc: 'Payment methods and invoicing' },
          { title: 'Security', desc: 'Password and access controls' },
        ].map((setting) => (
          <div
            key={setting.title}
            className="bg-white rounded-xl p-6 shadow-card flex items-center justify-between hover:shadow-card-hover transition-shadow cursor-pointer"
          >
            <div>
              <h3 className="font-medium text-gray-900">{setting.title}</h3>
              <p className="text-sm text-gray-500">{setting.desc}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400">›</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
