/**
 * EditAppointmentModal - Edit today's appointment modal
 * @crossref:used-in[TodayAppointments, Overview, Calendar]
 * @crossref:uses[SearchableSelector, useCustomers, useEmployees, useLocations]
 *
 * Luxurious design with searchable dropdowns.
 * Customer is READ-ONLY (appointment belongs to a specific patient).
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  User, 
  MapPin, 
  Phone, 
  FileText, 
  Palette, 
  Stethoscope,
  ChevronDown,
  Search,
  Check
} from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { TimePicker } from '@/components/ui/TimePicker';
import { useEmployees } from '@/hooks/useEmployees';
import { useLocations } from '@/hooks/useLocations';
import { updateAppointment } from '@/lib/api';
import type { OverviewAppointment } from '@/hooks/useOverviewAppointments';
// Color codes from database (0-7) - Light luxurious backgrounds matching card colors
// These lighter shades ensure text readability while maintaining elegant aesthetics
const APPOINTMENT_COLORS: Record<string, { 
  bg: string; 
  border: string; 
  label: string; 
  textColor: string;
  previewGradient: string;
}> = {
  '0': { 
    bg: 'bg-blue-100', 
    border: 'border-blue-300',
    label: 'Ocean Blue', 
    textColor: 'text-blue-800',
    previewGradient: 'from-blue-200 to-blue-300'
  },
  '1': { 
    bg: 'bg-emerald-100', 
    border: 'border-emerald-300',
    label: 'Emerald', 
    textColor: 'text-emerald-800',
    previewGradient: 'from-emerald-200 to-emerald-300'
  },
  '2': { 
    bg: 'bg-amber-100', 
    border: 'border-amber-300',
    label: 'Amber', 
    textColor: 'text-amber-800',
    previewGradient: 'from-amber-200 to-amber-300'
  },
  '3': { 
    bg: 'bg-red-100', 
    border: 'border-red-300',
    label: 'Ruby', 
    textColor: 'text-red-800',
    previewGradient: 'from-red-200 to-red-300'
  },
  '4': { 
    bg: 'bg-violet-100', 
    border: 'border-violet-300',
    label: 'Amethyst', 
    textColor: 'text-violet-800',
    previewGradient: 'from-violet-200 to-violet-300'
  },
  '5': { 
    bg: 'bg-pink-100', 
    border: 'border-pink-300',
    label: 'Rose', 
    textColor: 'text-pink-800',
    previewGradient: 'from-pink-200 to-pink-300'
  },
  '6': { 
    bg: 'bg-cyan-100', 
    border: 'border-cyan-300',
    label: 'Cyan', 
    textColor: 'text-cyan-800',
    previewGradient: 'from-cyan-200 to-cyan-300'
  },
  '7': { 
    bg: 'bg-lime-100', 
    border: 'border-lime-300',
    label: 'Lime', 
    textColor: 'text-lime-800',
    previewGradient: 'from-lime-200 to-lime-300'
  },
};

// Status options matching database states
const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'arrived', label: 'Arrived', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'in Examination', label: 'In Examination', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'in-progress', label: 'In Progress', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { value: 'done', label: 'Done', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200' },
];

interface EditAppointmentModalProps {
  readonly appointment: OverviewAppointment | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}

interface Employee {
  id: string;
  name: string;
  avatar: string;
  roles: readonly string[];
  locationName: string;
}

interface Location {
  id: string;
  name: string;
  address: string;
}

// Luxurious Searchable Dropdown Component
interface SearchableSelectorProps<T extends { id: string; name: string }> {
  options: T[];
  selectedId: string;
  onChange: (id: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  renderOption: (option: T) => React.ReactNode;
  disabled?: boolean;
}

function SearchableSelector<T extends { id: string; name: string }>({
  options,
  selectedId,
  onChange,
  placeholder,
  icon,
  renderOption,
  disabled = false,
}: SearchableSelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectedOption = options.find(o => o.id === selectedId);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const lower = searchTerm.toLowerCase();
    return options.filter(o => o.name.toLowerCase().includes(lower));
  }, [options, searchTerm]);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200
          ${disabled 
            ? 'bg-gray-50 border-gray-200 cursor-not-allowed' 
            : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md cursor-pointer'
          }
        `}
      >
        <span className="text-gray-400">{icon}</span>
        <span className={`flex-1 text-left ${selectedOption ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          {selectedOption?.name || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to search..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">No matches found</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  className={`
                    w-full px-4 py-2.5 text-left transition-colors flex items-center gap-3
                    ${selectedId === option.id 
                      ? 'bg-orange-50 text-orange-700' 
                      : 'hover:bg-gray-50 text-gray-700'
                    }
                  `}
                >
                  <span className="flex-1">{renderOption(option)}</span>
                  {selectedId === option.id && (
                    <Check className="w-4 h-4 text-orange-500" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function EditAppointmentModal({ appointment, isOpen, onClose, onSaved }: EditAppointmentModalProps) {
  // Fetch real data from API
  const { employees: apiEmployees, isLoading: employeesLoading } = useEmployees();
  const { allLocations: apiLocations, isLoading: locationsLoading } = useLocations();

  // Form state
  const [doctorId, setDoctorId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [status, setStatus] = useState('');
  const [colorCode, setColorCode] = useState('0');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form with appointment data when opened
  useEffect(() => {
    if (appointment && isOpen) {
      setDoctorId(appointment.doctorId || '');
      setLocationId(appointment.locationId || '');
      
      const today = new Date();
      setDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
      setTime(appointment.time || '09:00');
      
      // Extract service name from note if available
      setServiceName(appointment.note?.split('\n')[0] || '');
      setStatus(mapTopStatusToDbState(appointment.topStatus, appointment.checkInStatus));
      setColorCode(appointment.color || '0');
      setNotes(appointment.note || '');
      setError(null);
    }
  }, [appointment, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.searchable-selector')) {
        // Close any open dropdowns
        document.querySelectorAll('.searchable-dropdown').forEach(el => {
          el.classList.add('hidden');
        });
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Convert UI status back to DB state
  function mapTopStatusToDbState(topStatus: string, checkInStatus: string | null): string {
    if (topStatus === 'cancelled') return 'cancelled';
    if (topStatus === 'arrived') {
      if (checkInStatus === 'in-treatment') return 'in Examination';
      if (checkInStatus === 'done') return 'done';
      return 'arrived';
    }
    return 'scheduled';
  }

  // Convert API data to selector format
  const doctors: Employee[] = apiEmployees
    .filter(e => e.status === 'active' && (e.roles?.includes('dentist') || e.roles?.includes('orthodontist')))
    .map(e => ({
      id: e.id,
      name: e.name,
      avatar: e.avatar || e.name.charAt(0).toUpperCase(),
      roles: e.roles || ['dentist'],
      locationName: e.locationName || '',
    }));

  const locations: Location[] = apiLocations.map(l => ({
    id: l.id,
    name: l.name,
    address: l.address || '',
  }));

  const selectedDoctor = doctors.find(d => d.id === doctorId);
  const selectedLocation = locations.find(l => l.id === locationId);
  void STATUS_OPTIONS.find(s => s.value === status);
  void APPOINTMENT_COLORS[colorCode];

  const isLoading = employeesLoading || locationsLoading;

  async function handleSave() {
    if (!appointment) return;
    
    setIsSaving(true);
    setError(null);

    try {
      await updateAppointment(appointment.id, {
        doctorId: doctorId || undefined,
        companyid: locationId || undefined,
        date: date,
        timeExpected: 30, // default 30 minutes
        state: status,
        color: colorCode,
        note: notes || undefined,
      });
      
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save appointment');
    } finally {
      setIsSaving(false);
    }
  }

  function handleClose() {
    if (!isSaving) {
      onClose();
    }
  }

  if (!isOpen || !appointment) return null;

  return (
    <div className="modal-container">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="modal-content animate-in zoom-in-95 duration-200">
        {/* Header with gradient */}
        <div className="modal-header relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Edit Appointment</h2>
              <p className="text-sm text-orange-100 mt-1 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                {appointment.time} · {appointment.locationName}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="modal-body px-6 py-6 space-y-5">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-2" />
              Loading...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          {/* CUSTOMER - READ ONLY */}
          <div className="searchable-selector">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              Patient
            </label>
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                {appointment.customerName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{appointment.customerName}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {appointment.customerPhone}
                </p>
              </div>
              <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded-full border border-gray-200">
                Linked Patient
              </span>
            </div>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              value={date}
              onChange={setDate}
              label="Date"
              icon={<Calendar className="w-3.5 h-3.5" />}
            />
            <TimePicker
              value={time}
              onChange={setTime}
              label="Time"
              icon={<Clock className="w-3.5 h-3.5" />}
              interval={15}
            />
          </div>

          {/* Doctor - Luxurious Searchable Dropdown */}
          <div className="searchable-selector">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Stethoscope className="w-3.5 h-3.5" />
              Doctor
            </label>
            <SearchableSelector
              options={doctors}
              selectedId={doctorId}
              onChange={setDoctorId}
              placeholder="Select doctor..."
              icon={<Stethoscope className="w-4 h-4" />}
              renderOption={(doctor) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-orange-600 font-semibold text-xs">
                    {doctor.avatar}
                  </div>
                  <div>
                    <p className="font-medium">{doctor.name}</p>
                    <p className="text-xs text-gray-400">{doctor.locationName}</p>
                  </div>
                </div>
              )}
            />
            {selectedDoctor && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Selected: <span className="font-medium text-gray-700">{selectedDoctor.name}</span>
              </div>
            )}
          </div>

          {/* Location - Luxurious Searchable Dropdown */}
          <div className="searchable-selector">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              Location
            </label>
            <SearchableSelector
              options={locations}
              selectedId={locationId}
              onChange={setLocationId}
              placeholder="Select location..."
              icon={<MapPin className="w-4 h-4" />}
              renderOption={(location) => (
                <div>
                  <p className="font-medium">{location.name}</p>
                  {location.address && (
                    <p className="text-xs text-gray-400">{location.address}</p>
                  )}
                </div>
              )}
            />
            {selectedLocation && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Selected: <span className="font-medium text-gray-700">{selectedLocation.name}</span>
              </div>
            )}
          </div>

          {/* Service Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Stethoscope className="w-3.5 h-3.5" />
              Service
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g., Teeth Cleaning, Root Canal..."
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={`
                    px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-200
                    ${status === s.value
                      ? `${s.color} ring-2 ring-offset-1 ring-orange-500/30 shadow-sm`
                      : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                    }
                  `}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection - Luxurious Grid with Light Card-Matching Colors */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" />
              Card Color
            </label>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(APPOINTMENT_COLORS).map(([code, color]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setColorCode(code)}
                  className={`
                    group relative p-3 rounded-xl transition-all duration-200 border-2
                    ${colorCode === code 
                      ? `${color.bg} ${color.border} shadow-lg scale-105` 
                      : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-md'
                  }
                  `}
                  title={color.label}
                >
                  {/* Color Preview Block - Light elegant shade matching card */}
                  <div className={`
                    w-full aspect-square rounded-lg bg-gradient-to-br ${color.previewGradient}
                    flex items-center justify-center shadow-inner border border-white/50
                  `}>
                    {colorCode === code && (
                      <div className={`
                        w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center
                      `}
                      >
                        <Check className={`w-4 h-4 ${color.textColor}`} />
                      </div>
                    )}
                  </div>
                  <p className={`mt-2 text-[10px] font-semibold text-center truncate ${color.textColor}`}>
                    {color.label}
                  </p>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400 text-center">
              Selected color will appear on the appointment card outside
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes about this appointment..."
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer px-6 py-5 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/25"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
