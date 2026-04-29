interface HealthCheckupEmptyStateProps {
  readonly source?: string;
  readonly message?: string;
}

function getEmptyStateMessage(source?: string, message?: string): string {
  if (message) return message;
  if (source === 'hosoonline-auth-failed') {
    return 'Hosoonline authentication failed. Update the Hosoonline token before images can load.';
  }
  if (source === 'hosoonline-not-configured') {
    return 'Hosoonline is not configured for this environment.';
  }
  if (source === 'hosoonline-unavailable') {
    return 'Hosoonline is unavailable right now. Images could not be checked.';
  }
  return 'No health checkup images found on hosoonline.com.';
}

export function HealthCheckupEmptyState({ source, message }: HealthCheckupEmptyStateProps) {
  const isWarning = source === 'hosoonline-auth-failed' || source === 'hosoonline-unavailable' || source === 'hosoonline-not-configured';

  return (
    <div className="p-6">
      <p className={isWarning ? 'text-sm text-amber-700' : 'text-sm text-gray-400'}>
        {getEmptyStateMessage(source, message)}
      </p>
    </div>
  );
}
