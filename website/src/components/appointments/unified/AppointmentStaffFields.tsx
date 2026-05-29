import { Stethoscope, Handshake } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DoctorSelector } from '@/components/shared/DoctorSelector';
import { CtvSelector } from '@/components/shared/CtvSelector';
import type { Employee } from '@/types/employee';
import type { CtvOption } from '@/lib/api/ctv';
import type { UnifiedAppointmentFormData } from './appointmentForm.types';

interface AppointmentStaffFieldsProps {
  readonly employees: readonly Employee[];
  readonly data: UnifiedAppointmentFormData;
  readonly onChange: (patch: Partial<UnifiedAppointmentFormData>) => void;
  readonly loading?: boolean;
  readonly ctvs?: readonly CtvOption[];
  readonly ctvsLoading?: boolean;
}

export function AppointmentStaffFields({
  employees,
  data,
  onChange,
  loading = false,
  ctvs = [],
  ctvsLoading = false,
}: AppointmentStaffFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="appointment-staff-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          allowClear
          onChange={(employeeId) => {
            const emp = employees.find((e) => e.id === employeeId);
            onChange({
              doctorId: emp?.id ?? null,
              doctorName: emp?.name ?? null,
            });
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
          allowClear
          onChange={(employeeId) => {
            const emp = employees.find((e) => e.id === employeeId);
            onChange({
              assistantId: emp?.id ?? null,
              assistantName: emp?.name ?? null,
            });
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
          allowClear
          onChange={(employeeId) => {
            const emp = employees.find((e) => e.id === employeeId);
            onChange({
              dentalAideId: emp?.id ?? null,
              dentalAideName: emp?.name ?? null,
            });
          }}
          placeholder={t('appointments:form.selectDentalAide')}
        />
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          <Handshake className="w-3.5 h-3.5" />
          {t('appointments:form.ctv', 'Cộng tác viên (CTV)')}
        </label>
        <CtvSelector
          ctvs={ctvs}
          selectedId={data.ctvId || null}
          loading={ctvsLoading}
          onChange={(ctvId) => onChange({ ctvId })}
          placeholder={t('appointments:form.selectCtv', 'Chọn cộng tác viên...')}
        />
      </div>
    </div>
  );
}
