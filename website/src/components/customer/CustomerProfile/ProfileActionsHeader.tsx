import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, Edit2, Trash2 } from 'lucide-react';

interface ProfileActionsHeaderProps {
  readonly onBack: () => void;
  readonly onEdit?: () => void;
  readonly onSoftDelete?: () => void;
  readonly onHardDelete?: () => void;
  readonly canSoftDelete?: boolean;
  readonly canHardDelete?: boolean;
}

export function ProfileActionsHeader({
  onBack,
  onEdit,
  onSoftDelete,
  onHardDelete,
  canSoftDelete,
  canHardDelete,
}: ProfileActionsHeaderProps) {
  const { t } = useTranslation('customers');
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('customerProfile')}</h1>
          <p className="text-sm text-gray-500">{t('viewAndManage')}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:ml-auto">
        {onEdit && (
          <button onClick={onEdit} className="flex items-center gap-2 h-10 px-4 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        )}
        {(canSoftDelete || canHardDelete) && (
          <div className="relative flex items-center">
            <button
              onClick={() => { if (canSoftDelete) onSoftDelete?.(); else onHardDelete?.(); }}
              className="flex items-center justify-center gap-2 h-10 px-4 bg-red-600 text-white rounded-l-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowDeleteMenu((v) => !v)}
              className="flex items-center justify-center h-10 px-2 bg-red-600 text-white rounded-r-lg border-l border-red-500 hover:bg-red-700 transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            {showDeleteMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                {canSoftDelete && (
                  <button
                    onClick={() => { setShowDeleteMenu(false); onSoftDelete?.(); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Soft Delete
                  </button>
                )}
                {canHardDelete && (
                  <button
                    onClick={() => { setShowDeleteMenu(false); onHardDelete?.(); }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Hard Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
