import { useTranslation } from 'react-i18next';

import { CtvHierarchyPanel } from '@/components/ctv/CtvHierarchyPanel';
import type { CtvHierarchyResponse } from '@/lib/api/ctv';

interface CtvNetworkTabProps {
  readonly hierarchy: CtvHierarchyResponse | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onRetry: () => void;
}

export function CtvNetworkTab({ hierarchy, isLoading, error, onRetry }: CtvNetworkTabProps) {
  const { t } = useTranslation('ctv');

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">{t('hierarchy.title')}</h2>
      <p className="mt-1 text-sm leading-6 text-gray-500">{t('hierarchy.subtitle')}</p>
      <div className="mt-4">
        <CtvHierarchyPanel hierarchy={hierarchy} isLoading={isLoading} error={error} onRetry={onRetry} />
      </div>
    </div>
  );
}
