import { Stethoscope } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DoctorSelector } from '@/components/shared/DoctorSelector';
import type { Employee } from '@/types/employee';
import type { UnifiedAppointmentFormData } from './appointmentForm.types';

interface AppointmentStaffFieldsProps {
  readonly employees: readonly Employee[];
  readonly data: UnifiedAppointmentFormData;
  readonly onChange: (patch: Partial<UnifiedAppointmentFormData>) => void;
  readonly loading?: boolean;
}

export function AppointmentStaffFields({
  employees,
  data,
  onChange,
  loading = false,
}: AppointmentStaffFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          <Stethoscope className="w-3.5 h-3.5" />
          {t('appointments:form.doctor')}
        </label>
        <DoctorSelector
          employees={employees}
          selectedId={data.doctorId || null}
          filterRoles={['doctor']}
          loading={loading}
          onChange={(employeeId) => {
            const emp = employees.find((e) => e.id === employeeId);
            onChange({ doctorId: emp?.id, doctorName: emp?.name });
          }}
          placeholder={t('appointments:form.selectDoctor')}
        />
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {t('appointments:form.assistant')}
        </label>
        <DoctorSelector
          employees={employees}
          selectedId={data.assistantId || null}
          filterRoles={['assistant']}
          loading={loading}
          onChange={(employeeId) => {
            const emp = employees.find((e) => e.id === employeeId);
            onChange({ assistantId: emp?.id, assistantName: emp?.name });
          }}
          placeholder={t('appointments:form.selectAssistant')}
        />
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {t('appointments:form.dentalAide')}
        </label>
        <DoctorSelector
          employees={employees}
          selectedId={data.dentalAideId || null}
          filterRoles={['doctor-assistant']}
          loading={loading}
          onChange={(employeeId) => {
            const emp = employees.find((e) => e.id === employeeId);
            onChange({ dentalAideId: emp?.id, dentalAideName: emp?.name });
          }}
          placeholder={t('appointments:form.selectDentalAide')}
        />
      </div>
    </div>
  );
}
