import { useState } from 'react';
import { ChevronDown, Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { APPOINTMENT_CARD_COLORS, APPOINTMENT_STATUS_OPTIONS } from '@/constants';
import type { AppointmentFormMode, UnifiedAppointmentFormData } from './appointmentForm.types';

interface AppointmentAppearanceFieldsProps {
  readonly mode: AppointmentFormMode;
  readonly color: string | undefined;
  readonly status: UnifiedAppointmentFormData['status'];
  readonly onColorChange: (color: string) => void;
  readonly onStatusChange: (status: UnifiedAppointmentFormData['status']) => void;
}

export function AppointmentAppearanceFields({
  mode,
  color,
  status,
  onColorChange,
  onStatusChange,
}: AppointmentAppearanceFieldsProps) {
  const { t } = useTranslation();
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const colorConfig = color ? APPOINTMENT_CARD_COLORS[color] : APPOINTMENT_CARD_COLORS['1'];
  const isEdit = mode === 'edit';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="relative">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          <Palette className="w-3.5 h-3.5" />
          {t('appointments:label.cardColor')}
        </label>
        <button
          type="button"
          onClick={() => setColorDropdownOpen((v) => !v)}
          className={`w-full px-4 py-3 text-sm border rounded-xl flex items-center gap-2 transition-all ${colorConfig?.bgHighlight || 'bg-gray-50'} ${colorConfig?.border || 'border-gray-200'}`}
        >
          <span className={`w-4 h-4 rounded-full ${colorConfig?.dot?.replace('border-l-', 'bg-') || 'bg-gray-400'}`} />
          <span className="flex-1 text-left">{t(colorConfig?.label || 'common:colors.blue')}</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>

        {colorDropdownOpen && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-4 gap-2">
            {Object.entries(APPOINTMENT_CARD_COLORS).map(([code, config]) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  onColorChange(code);
                  setColorDropdownOpen(false);
                }}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                  color === code ? 'ring-2 ring-orange-400 bg-orange-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${config.previewGradient}`} />
                <span className="text-[10px] text-gray-600">{t(config.label)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {isEdit && (
        <div className="relative">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {t('appointments:form.status')}
          </label>
          <button
            type="button"
            onClick={() => setStatusDropdownOpen((v) => !v)}
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl flex items-center gap-2 bg-white"
          >
            <span className="flex-1 text-left capitalize">{status}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {statusDropdownOpen && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1">
              {APPOINTMENT_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onStatusChange(opt.value as UnifiedAppointmentFormData['status']);
                    setStatusDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    status === opt.value ? 'bg-orange-50 text-orange-700' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${opt.color.split(' ')[0].replace('bg-', 'bg-')}`} />
                  {t(opt.label)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
