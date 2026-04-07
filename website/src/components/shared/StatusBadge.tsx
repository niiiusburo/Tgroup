/**
 * StatusBadge - Colored status indicator badge
 * @crossref:used-in[Appointments, Services, Calendar, EmployeeTable]
 */

type StatusVariant = 'active' | 'pending' | 'cancelled' | 'completed' | 'inactive' | 'draft';

const VARIANT_STYLES: Record<StatusVariant, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
  completed: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  inactive: 'bg-gray-50 text-gray-600 ring-gray-500/20',
  draft: 'bg-gray-50 text-gray-500 ring-gray-400/20',
};

interface StatusBadgeProps {
  readonly status: StatusVariant;
  readonly label?: string;
  readonly size?: 'sm' | 'md';
}

export function StatusBadge({
  status,
  label,
  size = 'sm',
}: StatusBadgeProps) {
  const displayLabel = label ?? status.charAt(0).toUpperCase() + status.slice(1);
  const styles = VARIANT_STYLES[status];
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset
        ${styles} ${sizeClasses}
      `}
    >
      <span className={`
        inline-block rounded-full
        ${size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'}
        ${status === 'active' ? 'bg-emerald-500' : ''}
        ${status === 'pending' ? 'bg-amber-500' : ''}
        ${status === 'cancelled' ? 'bg-red-500' : ''}
        ${status === 'completed' ? 'bg-blue-500' : ''}
        ${status === 'inactive' ? 'bg-gray-400' : ''}
        ${status === 'draft' ? 'bg-gray-400' : ''}
      `} />
      {displayLabel}
    </span>
  );
}

export type { StatusVariant };
