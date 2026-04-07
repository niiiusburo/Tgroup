import { Stethoscope, X } from 'lucide-react';
import { useMemo } from 'react';
import { MOCK_EMPLOYEES, ROLE_LABELS } from '@/data/mockEmployees';

/**
 * FilterByDoctor - Quick doctor filter dropdown for lists and calendar
 * @crossref:used-in[Calendar, Appointments, Employees]
 */

interface FilterByDoctorProps {
  readonly selectedDoctorId: string | null;
  readonly onChange: (doctorId: string | null) => void;
  readonly className?: string;
}

export function FilterByDoctor({ selectedDoctorId, onChange, className = '' }: FilterByDoctorProps) {
  const doctors = useMemo(
    () =>
      MOCK_EMPLOYEES.filter(
        (e) =>
          e.status === 'active' &&
          e.roles.some((r) => r === 'dentist' || r === 'orthodontist'),
      ),
    [],
  );

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Stethoscope className="w-4 h-4 text-gray-400 shrink-0" />
      <select
        value={selectedDoctorId ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
      >
        <option value="">All Doctors</option>
        {doctors.map((doc) => (
          <option key={doc.id} value={doc.id}>
            {doc.name} — {doc.roles.map((r) => ROLE_LABELS[r]).join(', ')}
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
