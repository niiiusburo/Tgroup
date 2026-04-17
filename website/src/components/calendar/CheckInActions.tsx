import { UserCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CheckInActionsProps {
  readonly onCheckIn: () => void;
  readonly onCancel: () => void;
}

export function CheckInActions({ onCheckIn, onCancel }: CheckInActionsProps) {
  const { t } = useTranslation('calendar');
  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCheckIn();
        }}
        className="p-1 rounded hover:bg-emerald-100 text-emerald-600"
        title="Check-in"
        aria-label="Check-in">
        
        <UserCheck className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        className="p-1 rounded hover:bg-red-100 text-red-500"
        title={t("hyHn")}
        aria-label={t("hyHn")}>
        
        <X className="w-3.5 h-3.5" />
      </button>
    </div>);

}