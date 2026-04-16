import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Stethoscope } from 'lucide-react';
import { FieldLabel } from './FieldLabel';
import type { UseAddCustomerFormResult } from './useAddCustomerForm';

interface MedicalTabProps {
  formApi: UseAddCustomerFormResult;
}

const MEDICAL_CONDITIONS = [
  'diabetes',
  'cardiovascular',
  'drugAllergy',
  'hypertension',
  'asthma',
  'pregnant',
] as const;

export function MedicalTab({ formApi }: MedicalTabProps) {
  const { t } = useTranslation('customers');
  const { formData, set } = formApi;

  // Parse initial checked conditions from medicalhistory
  const initialChecked = useMemo(() => {
    const checked = new Set<string>();
    MEDICAL_CONDITIONS.forEach((key) => {
      const conditionLabel = t(`conditions.${key}`, key === 'drugAllergy' ? 'Dị ứng thuốc' : key === 'cardiovascular' ? 'Tim mạch' : key);
      if (formData.medicalhistory?.includes(conditionLabel)) {
        checked.add(key);
      }
    });
    return checked;
  }, [formData.medicalhistory, t]);

  const [checkedConditions, setCheckedConditions] = useState<Set<string>>(initialChecked);

  const handleConditionToggle = (conditionKey: string, _conditionLabel: string) => {
    setCheckedConditions((prev) => {
      const newChecked = new Set(prev);
      if (newChecked.has(conditionKey)) {
        newChecked.delete(conditionKey);
      } else {
        newChecked.add(conditionKey);
      }

      // Build updated medicalhistory with only checked conditions
      const conditionsText = Array.from(newChecked)
        .map((key) => t(`conditions.${key}`, key === 'drugAllergy' ? 'Dị ứng thuốc' : key === 'cardiovascular' ? 'Tim mạch' : key))
        .join('\n');

      // Preserve existing manual text, only manage checkbox-added items
      const baseText = MEDICAL_CONDITIONS.flatMap((key) => [
        t(`conditions.${key}`, key === 'drugAllergy' ? 'Dị ứng thuốc' : key === 'cardiovascular' ? 'Tim mạch' : key),
      ]);
      
      // Remove all condition labels from current text, then add back checked ones
      let cleanText = formData.medicalhistory || '';
      baseText.forEach((label) => {
        cleanText = cleanText.split('\n').filter((line) => line.trim() !== label).join('\n');
      });
      cleanText = cleanText.trim();

      const newText = conditionsText ? (cleanText ? `${cleanText}\n${conditionsText}` : conditionsText) : cleanText;
      set('medicalhistory', newText);

      return newChecked;
    });
  };

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
        {MEDICAL_CONDITIONS.map((key) => {
          const conditionLabel = t(`conditions.${key}`, key === 'drugAllergy' ? 'Dị ứng thuốc' : key === 'cardiovascular' ? 'Tim mạch' : key);
          return (
            <label
              key={key}
              className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <input
                type="checkbox"
                className="accent-orange-500 w-4 h-4 rounded"
                checked={checkedConditions.has(key)}
                onChange={() => handleConditionToggle(key, conditionLabel)}
              />
              <span>{conditionLabel}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
