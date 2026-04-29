import { Megaphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCustomerSources } from '@/hooks/useSettings';
import { FieldLabel } from './FieldLabel';
import { selectClass } from './styles';

interface CustomerSourceFieldProps {
  readonly selectedId: string;
  readonly onChange: (sourceId: string) => void;
}

export function CustomerSourceField({ selectedId, onChange }: CustomerSourceFieldProps) {
  const { t } = useTranslation('customers');
  const { allSources, loading } = useCustomerSources();

  return (
    <div className="mt-5">
      <FieldLabel icon={Megaphone}>{t('form.customerSource', 'Nguồn khách hàng')}</FieldLabel>
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className={selectClass(loading)}
      >
        <option value="">-- {t('select.customerSource', 'Chọn nguồn khách hàng')} --</option>
        {allSources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.name}
          </option>
        ))}
      </select>
    </div>
  );
}
