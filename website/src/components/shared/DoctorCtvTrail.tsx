import { ChevronRight } from 'lucide-react';

interface DoctorCtvTrailProps {
  readonly doctorName?: string | null;
  readonly ctvName?: string | null;
  /** Optional label prefix for the doctor segment (default "BS."). */
  readonly doctorLabel?: string;
}

function isMeaningful(v?: string | null): boolean {
  return !!v && v.trim() !== '' && v !== 'N/A';
}

export function DoctorCtvTrail({ doctorName, ctvName, doctorLabel = 'BS.' }: DoctorCtvTrailProps) {
  const hasDoctor = isMeaningful(doctorName);
  const hasCtv = isMeaningful(ctvName);
  if (!hasDoctor && !hasCtv) return null;

  return (
    <p className="flex items-center gap-1 text-xs text-gray-500" data-testid="doctor-ctv-trail">
      {hasDoctor && (
        <span className="truncate font-medium text-gray-600">
          {doctorLabel} {doctorName}
        </span>
      )}
      {hasDoctor && hasCtv && <ChevronRight className="h-3 w-3 shrink-0 text-gray-300" aria-hidden="true" />}
      {hasCtv && (
        <span
          className="inline-flex items-center gap-1 truncate rounded-full bg-orange-50 px-1.5 py-0.5 font-medium text-orange-700 ring-1 ring-orange-500/20"
          data-testid="doctor-ctv-trail-ctv"
        >
          CTV: {ctvName}
        </span>
      )}
    </p>
  );
}
