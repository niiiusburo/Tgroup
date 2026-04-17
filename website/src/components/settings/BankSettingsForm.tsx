/**
 * BankSettingsForm - Clinic bank account configuration form
 * @crossref:used-in[Settings.tsx]
 * @crossref:uses[useBankSettings.ts]
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBankSettings, BankSettings } from '@/hooks/useBankSettings';
import { Building2, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { BankSelector } from '@/components/shared/BankSelector';

export function BankSettingsForm() {
  const { t } = useTranslation('settings');
  const { settings, loading, updateSettings } = useBankSettings();
  const [formData, setFormData] = useState<BankSettings>({
    bankBin: '',
    bankNumber: '',
    bankAccountName: ''
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (field: keyof BankSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await updateSettings(formData);
      setSuccess(true);
    } catch {

      // error handled by hook
    } finally {setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-gray-500"></span>
      </div>);

  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900"></h3>
          <p className="text-sm text-gray-500"></p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="bankBin" className="block text-sm font-medium text-gray-700">

          </label>
          <BankSelector
            value={formData.bankBin}
            onChange={(bin) => handleChange('bankBin', bin)}
            placeholder={t('bankSettingsContent.selectBank', { ns: 'settings' })} />
          
          <p className="text-xs text-gray-400"></p>
        </div>

        <div className="space-y-2">
          <label htmlFor="bankNumber" className="block text-sm font-medium text-gray-700">

          </label>
          <input
            id="bankNumber"
            type="text"
            value={formData.bankNumber}
            onChange={(e) => handleChange('bankNumber', e.target.value)}
            placeholder="1234567890"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            required />
          
        </div>

        <div className="md:col-span-2 space-y-2">
          <label htmlFor="bankAccountName" className="block text-sm font-medium text-gray-700">

          </label>
          <input
            id="bankAccountName"
            type="text"
            value={formData.bankAccountName}
            onChange={(e) => handleChange('bankAccountName', e.target.value)}
            placeholder="CONG TY TNHH NHA KHOA TAM DENTIST"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            required />
          
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
          
          {saving ?
          <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span></span>
            </> :

          <>
              <Save className="w-4 h-4" />
              <span></span>
            </>
          }
        </button>

        {success &&
        <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium"></span>
          </div>
        }
      </div>
    </form>);

}