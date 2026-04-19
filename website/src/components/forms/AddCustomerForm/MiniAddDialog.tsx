import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

export function MiniAddDialog({
  isOpen,
  title,
  placeholder,
  onSubmit,
  onClose,
  children,
}: {
  readonly isOpen: boolean;
  readonly title: string;
  readonly placeholder?: string;
  readonly onSubmit: (value: string, extra?: string) => void;
  readonly onClose: () => void;
  readonly children?: React.ReactNode;
}) {
  const { t } = useTranslation('customers');
  const [value, setValue] = useState('');
  const [extra, setExtra] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!value.trim()) return;
    onSubmit(value.trim(), extra.trim() || undefined);
    setValue('');
    setExtra('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary mb-3"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        {children && (
          <div className="mb-3">
            {children}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            {t('cancel', 'Hủy')}
          </button>
          <button
            onClick={handleSave}
            disabled={!value.trim()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {t('save', 'Lưu')}
          </button>
        </div>
      </div>
    </div>
  );
}
