import { useTranslation } from 'react-i18next';
import { Stethoscope } from 'lucide-react';
import { FieldLabel } from './FieldLabel';
import type { UseAddCustomerFormResult } from './useAddCustomerForm';

interface MedicalTabProps {
  formApi: UseAddCustomerFormResult;
}

export function MedicalTab({ formApi }: MedicalTabProps) {
  const { t } = useTranslation('customers');
  const { formData, set } = formApi;
  return (
<div className="max-w-3xl">
  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-4">
    <h4 className="text-sm font-medium text-orange-800 mb-1">{t('medicalNotice.title', 'Lưu ý y tế')}</h4>
    <p className="text-xs text-orange-600">
      {t('medicalNotice.description', 'Thông tin tiểu sử bệnh giúp bác sĩ đánh giá tốt hơn tình trạng sức khỏe của bệnh nhân.')}
    </p>
  </div>
  <FieldLabel icon={Stethoscope}>{t('form.medicalHistory', 'Tiểu sử bệnh')}</FieldLabel>
  <textarea
    value={formData.medicalhistory}
    onChange={(e) => set('medicalhistory', e.target.value)}
    placeholder={t('medicalHistoryPlaceholder', 'Nhập tiểu sử bệnh, dị ứng, thuốc đang dùng...')}
    rows={8}
    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none transition-all hover:border-gray-300"
  />
  <div className="mt-4 grid grid-cols-3 gap-3">
    {[
      t('conditions.diabetes', 'Tiểu đường'),
      t('conditions.cardiovascular', 'Tim mạch'),
      t('conditions.drugAllergy', 'Dị ứng thuốc'),
      t('conditions.hypertension', 'Huyết áp cao'),
      t('conditions.asthma', 'Hen suyễn'),
      t('conditions.pregnant', 'Đang mang thai'),
    ].map((cond) => (
      <label
        key={cond}
        className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <input
          type="checkbox"
          className="accent-orange-500 w-4 h-4 rounded"
          onChange={(e) => {
            if (e.target.checked) {
              set('medicalhistory', formData.medicalhistory ? `${formData.medicalhistory}\n${cond}` : cond);
            }
          }}
        />
        <span>{cond}</span>
      </label>
    ))}
  </div>
</div>

  );
}
