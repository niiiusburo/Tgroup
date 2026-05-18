import { useTranslation } from 'react-i18next';

interface HealthCheckupEmptyStateProps {
  readonly source?: string;
  readonly message?: string;
  readonly patientExists?: boolean;
}

type Variant = 'warning' | 'info' | 'muted';

function pickKey(source: string | undefined, patientExists: boolean | undefined): { key: string; variant: Variant } {
  if (source === 'hosoonline-auth-failed') return { key: 'checkupEmptyAuthFailed', variant: 'warning' };
  if (source === 'hosoonline-not-configured') return { key: 'checkupEmptyNotConfigured', variant: 'warning' };
  if (source === 'hosoonline-unavailable') return { key: 'checkupEmptyUnavailable', variant: 'warning' };
  if (patientExists === false) return { key: 'checkupEmptyPatientMissing', variant: 'info' };
  if (patientExists === true) return { key: 'checkupEmptyNoImages', variant: 'info' };
  return { key: 'checkupEmptyDefault', variant: 'muted' };
}

const variantClass: Record<Variant, string> = {
  warning: 'text-sm text-amber-700',
  info: 'text-sm text-gray-600',
  muted: 'text-sm text-gray-400',
};

export function HealthCheckupEmptyState({ source, message, patientExists }: HealthCheckupEmptyStateProps) {
  const { t } = useTranslation('customers');
  const { key, variant } = pickKey(source, patientExists);
  const text = message || t(key);

  return (
    <div className="p-6">
      <p className={variantClass[variant]}>{text}</p>
    </div>
  );
}
