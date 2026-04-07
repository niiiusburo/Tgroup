import { Stethoscope, X } from 'lucide-react';
import { useMemo } from 'react';

/**
 * FilterByDoctor - Quick doctor filter dropdown for lists and calendar
 * @crossref:used-in[Calendar, Appointments, Employees]
 *
 * Now accepts doctors as props instead of relying on mock employees.
 * If doctors array is empty, falls back to "All Doctors" placeholder.
 */

export interface DoctorOption {
  readonly id: string;
  readonly name: string;
  readonly roles?: string[];
}

interface FilterByDoctorProps {
  readonly selectedDoctorId: string | null;
  readonly onChange: (doctorId: string | null) => void;
  readonly doctors?: readonly DoctorOption[];
  readonly className?: string;
}

export function FilterByDoctor({ selectedDoctorId, onChange, doctors = [], className = '' }: FilterByDoctorProps) {
  const availableDoctors = useMemo(
    () =>
      doctors.filter(
        (d) =>
          d.roles === undefined ||
          d.roles.some((r) => r === 'dentist' || r === 'orthodontist' || r === 'doctor'),
      ),
    [doctors],
  );

  const selectedDoctor = availableDoctors.find((d) => d.id === selectedDoctorId);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Stethoscope className="w-4 h-4 text-gray-400 shrink-0" />
      <select
        value={selectedDoctorId ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
      >
        <option value="">All Doctors</option>
        {availableDoctors.map((doc) => (
          <option key={doc.id} value={doc.id}>
            {doc.name}{doc.roles ? ` — ${doc.roles.join(', ')}` : ''}
          </option>
        ))}
      </select>
      {selectedDoctorId && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Clear doctor filter"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {selectedDoctor && (
        <span className="text-xs text-gray-500 hidden sm:inline">
          Showing: {selectedDoctor.name}
        </span>
      )}
    </div>
  );
}
