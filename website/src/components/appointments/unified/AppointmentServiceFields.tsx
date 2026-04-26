import { Stethoscope } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ServiceCatalogSelector } from '@/components/shared/ServiceCatalogSelector';
import type { AppointmentType } from '@/constants';
import type { ServiceCatalogItem } from '@/types/service';

interface AppointmentServiceFieldsProps {
  readonly catalog: readonly ServiceCatalogItem[];
  readonly selectedServiceId: string | undefined;
  readonly appointmentType: AppointmentType;
  readonly onServiceChange: (serviceId: string | null) => void;
  readonly onTypeChange: (type: AppointmentType) => void;
}

const APPOINTMENT_TYPES: AppointmentType[] = [
  'cleaning',
  'consultation',
  'treatment',
  'surgery',
  'orthodontics',
  'cosmetic',
  'emergency',
];

export function AppointmentServiceFields({
  catalog,
  selectedServiceId,
  appointmentType,
  onServiceChange,
  onTypeChange,
}: AppointmentServiceFieldsProps) {
  const { t } = useTranslation();

  return (
    <>
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          <Stethoscope className="w-3.5 h-3.5" />
          {t('appointments:form.service')}
        </label>
        <ServiceCatalogSelector
          catalog={catalog}
          selectedId={selectedServiceId || null}
          onChange={onServiceChange}
          placeholder={t('appointments:form.selectService')}
        />
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {t('appointments:label.service')}
        </label>
        <div className="flex flex-wrap gap-2">
          {APPOINTMENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onTypeChange(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                appointmentType === type
                  ? 'bg-orange-100 text-orange-700 border border-orange-300'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {t(`calendar:appointmentTypes.${type}`)}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
