import { formatDate } from './CustomerProfile/formatDate';

interface RecordDateBadgeProps {
  readonly value: string | null | undefined;
  readonly ariaLabel?: string;
}

export function RecordDateBadge({ value, ariaLabel = 'Record date' }: RecordDateBadgeProps) {
  const formattedDate = formatDate(value);
  const [day = '--', month = '', year = '-'] = formattedDate === '-'
    ? []
    : formattedDate.split(' ');

  return (
    <div className="inline-flex min-w-[82px] items-center gap-2" aria-label={`${ariaLabel}: ${formattedDate}`}>
      <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-center shadow-sm">
        <span className="text-base font-bold leading-none text-gray-900">{day}</span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          {month || '---'}
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-gray-900">{year}</span>
      </span>
    </div>
  );
}
