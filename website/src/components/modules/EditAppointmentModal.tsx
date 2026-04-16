/**
 * EditAppointmentModal - Edit today's appointment modal
 * @crossref:used-in[TodayAppointments, Overview, Calendar]
 * @crossref:uses[SearchableSelector, useCustomers, useEmployees, useLocations]
 *
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║  APPOINTMENT MODULE FAMILY — @crossref:related[]                       ║
 * ╠════════════════════════════════════════════════════════════════════════╣
 * ║  This component is the EDIT variant of the appointment module.         ║
 * ║  When editing this file, you MUST also check:                          ║
 * ║                                                                        ║
 * ║  @crossref:related[AppointmentForm]  — CREATE variant                  ║
 * ║    • Color picker, STATUS_OPTIONS, selectors must be consistent         ║
 * ║                                                                        ║
 * ║  @crossref:related[AppointmentDetailsModal] — VIEW variant             ║
 * ║    • Status labels must match                                           ║
 * ║                                                                        ║
 * ║  @crossref:color-source[constants/index.ts APPOINTMENT_CARD_COLORS]    ║
 * ║    • Single source of truth for all color codes 0-7                    ║
 * ║    • DO NOT create local APPOINTMENT_COLORS maps                       ║
 * ║    • If you need previewGradient, ADD it to the constants export        ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 *
 * Luxurious design with searchable dropdowns.
 * Customer is READ-ONLY (appointment belongs to a specific patient).
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import { normalizeText } from '@/lib/utils';
import { updateAppointment, fetchProducts, type ApiProduct } from '@/lib/api';
import { APPOINTMENT_CARD_COLORS, APPOINTMENT_STATUS_OPTIONS } from '@/constants';
import type { OverviewAppointment } from '@/hooks/useOverviewAppointments';

// Status options imported from constants — single source of truth
const STATUS_OPTIONS = APPOINTMENT_STATUS_OPTIONS;

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
    const norm = normalizeText(searchTerm);
    return options.filter(o => normalizeText(o.name).includes(norm));
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
                placeholder="Search..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition-all"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">Không tìm thấy</div>
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

// Extract free-text portion of a note by removing structured metadata lines
function extractFreeTextNote(note: string): string {
  if (!note) return '';
  const lines = note.split('\n');
  const structuredPrefixes = ['Service:', 'Duration:', 'Type:'];
  const freeLines = lines.filter(line => !structuredPrefixes.some(prefix => line.startsWith(prefix)));
  return freeLines.join('\n').trim();
}

export function EditAppointmentModal({
  appointment, isOpen, onClose, onSaved }: EditAppointmentModalProps) {
  const { t } = useTranslation('appointments');
  // Fetch real data from API
  const { employees: apiEmployees, isLoading: employeesLoading } = useEmployees();
  const { allLocations: apiLocations, isLoading: locationsLoading } = useLocations();

  // Form state
  const [doctorId, setDoctorId] = useState('');
  const [assistantId, setAssistantId] = useState('');
  const [dentalAideId, setDentalAideId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [status, setStatus] = useState('');
  const [colorCode, setColorCode] = useState('0');
  const [notes, setNotes] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(30);
  const [customerType, setCustomerType] = useState<'new' | 'returning'>('new');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Services catalog state
  const [services, setServices] = useState<ApiProduct[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  // Load services catalog when modal opens
  useEffect(() => {
    if (isOpen) {
      setServicesLoading(true);
      fetchProducts({ limit: 200 })
        .then(response => setServices(response.items))
        .catch(() => setServices([]))
        .finally(() => setServicesLoading(false));
    }
  }, [isOpen]);

  // Effect 1: Sync core form fields from appointment (not serviceId — that needs services loaded)
  useEffect(() => {
    if (appointment && isOpen) {
      setDoctorId(appointment.doctorId || '');
      setAssistantId((appointment as any).assistantid || '');
      setDentalAideId((appointment as any).dentalaideid || '');
      setLocationId(appointment.locationId || '');

      // Use the appointment's stored date and time from the database
      setDate(appointment.date || '');
      setTime(appointment.time || '09:00');

      // Extract customer type from note
      const noteLines = appointment.note?.split('\n') || [];
      const typeLine = noteLines.find(l => l.startsWith('Type:'));
      if (typeLine) {
        setCustomerType(typeLine.includes('returning') ? 'returning' : 'new');
      } else {
        setCustomerType('new');
      }

      // Extract duration from note
      const durationLine = noteLines.find(l => l.startsWith('Duration:'));
      if (durationLine) {
        const duration = parseInt(durationLine.replace('Duration:', '').trim(), 10);
        setEstimatedDuration(isNaN(duration) ? 30 : duration);
      } else {
        setEstimatedDuration(30);
      }

      setStatus(mapTopStatusToDbState(appointment.topStatus, appointment.checkInStatus));
      setColorCode(appointment.color || '0');
      setNotes(extractFreeTextNote(appointment.note || ''));
      setError(null);
    }
  }, [appointment, isOpen]);

  // Effect 2: Match serviceId once services catalog is loaded
  useEffect(() => {
    if (appointment && isOpen && services.length > 0) {
      const noteLines = appointment.note?.split('\n') || [];
      const serviceLine = noteLines.find(l => l.startsWith('Service:'));
      if (serviceLine) {
        const serviceNameFromNote = serviceLine.replace('Service:', '').trim();
        const matchedService = services.find(s => s.name === serviceNameFromNote);
        setServiceId(matchedService?.id || '');
      } else {
        setServiceId('');
      }
    }
  }, [services, appointment?.note, isOpen]);

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

  // Convert API data to selector format.
  // Always include the appointment's currently-assigned doctor, even if they
  // would normally be filtered out (inactive, or not flagged as a doctor role) —
  // otherwise the dropdown shows the placeholder instead of the DB value.
  const doctors: Employee[] = useMemo(() => {
    const list: Employee[] = apiEmployees
      .filter(e => e.status === 'active' && e.roles?.includes('doctor'))
      .map(e => ({
        id: e.id,
        name: e.name,
        avatar: e.avatar || e.name.charAt(0).toUpperCase(),
        roles: e.roles || ['doctor'],
        locationName: e.locationName || '',
      }));

    const assignedId = appointment?.doctorId;
    if (assignedId && !list.some(d => d.id === assignedId)) {
      const assignedEmp = apiEmployees.find(e => e.id === assignedId);
      if (assignedEmp) {
        list.unshift({
          id: assignedEmp.id,
          name: assignedEmp.name,
          avatar: assignedEmp.avatar || assignedEmp.name.charAt(0).toUpperCase(),
          roles: assignedEmp.roles?.length ? assignedEmp.roles : ['doctor'],
          locationName: assignedEmp.locationName || '',
        });
      } else if (appointment?.doctorName) {
        list.unshift({
          id: assignedId,
          name: appointment.doctorName,
          avatar: appointment.doctorName.charAt(0).toUpperCase(),
          roles: ['doctor'],
          locationName: appointment.locationName || '',
        });
      }
    }
    return list;
  }, [apiEmployees, appointment?.doctorId, appointment?.doctorName, appointment?.locationName]);

  // Assistants (role: assistant)
  const assistants = useMemo(() => {
    const list = apiEmployees
      .filter(e => e.roles?.includes('assistant') && e.status === 'active')
      .map(e => ({
        id: e.id,
        name: e.name,
        avatar: e.avatar || e.name.charAt(0).toUpperCase(),
        roles: e.roles || ['assistant'],
        locationName: e.locationName || '',
      }));

    // Include currently selected assistant even if not in filtered list
    if (assistantId && !list.some(d => d.id === assistantId)) {
      const selected = apiEmployees.find(e => e.id === assistantId);
      if (selected) {
        list.unshift({
          id: selected.id,
          name: selected.name,
          avatar: selected.avatar || selected.name.charAt(0).toUpperCase(),
          roles: selected.roles || ['assistant'],
          locationName: selected.locationName || '',
        });
      }
    }
    return list;
  }, [apiEmployees, assistantId]);

  // Dental Aides (role: doctor-assistant)
  const dentalAides = useMemo(() => {
    const list = apiEmployees
      .filter(e => e.roles?.includes('doctor-assistant') && e.status === 'active')
      .map(e => ({
        id: e.id,
        name: e.name,
        avatar: e.avatar || e.name.charAt(0).toUpperCase(),
        roles: e.roles || ['doctor-assistant'],
        locationName: e.locationName || '',
      }));

    // Include currently selected dental aide even if not in filtered list
    if (dentalAideId && !list.some(d => d.id === dentalAideId)) {
      const selected = apiEmployees.find(e => e.id === dentalAideId);
      if (selected) {
        list.unshift({
          id: selected.id,
          name: selected.name,
          avatar: selected.avatar || selected.name.charAt(0).toUpperCase(),
          roles: selected.roles || ['doctor-assistant'],
          locationName: selected.locationName || '',
        });
      }
    }
    return list;
  }, [apiEmployees, dentalAideId]);

  const locations: Location[] = apiLocations.map(l => ({
    id: l.id,
    name: l.name,
    address: l.address || '',
  }));

  const selectedDoctor = doctors.find(d => d.id === doctorId);
  const selectedLocation = locations.find(l => l.id === locationId);
  const selectedService = services.find(s => s.id === serviceId);

  const isLoading = employeesLoading || locationsLoading || servicesLoading;

  async function handleSave() {
    if (!appointment) return;
    
    setIsSaving(true);
    setError(null);

    try {
      // Build note with service, duration, and customer type
      const serviceName = selectedService?.name || '';
      const noteParts = [
        serviceName ? `Service: ${serviceName}` : '',
        `Duration: ${estimatedDuration} min`,
        `Type: ${customerType === 'returning' ? 'Khách tái khám' : 'Khách mới'}`,
        notes,
      ].filter(Boolean);
      const fullNote = noteParts.join('\n');

      await updateAppointment(appointment.id, {
        doctorId: doctorId || undefined,
        assistantid: assistantId || undefined,
        dentalaideid: dentalAideId || undefined,
        companyid: locationId || undefined,
        date: date,
        timeExpected: estimatedDuration,
        state: status,
        color: colorCode,
        note: fullNote || undefined,
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
      <div className="modal-content animate-in zoom-in-95 duration-200 max-w-[900px]">
        {/* Header with gradient */}
        <div className="modal-header relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Sửa lịch hẹn</h2>
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
              Bệnh nhân
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
                Bệnh nhân đã liên kết
              </span>
            </div>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              value={date}
              onChange={setDate}
              label={t('form.date')}
              icon={<Calendar className="w-3.5 h-3.5" />}
            />
            <TimePicker
              value={time}
              onChange={setTime}
              label={t('form.startTime')}
              icon={<Clock className="w-3.5 h-3.5" />}
              interval={15}
            />
          </div>

          {/* Doctor - Luxurious Searchable Dropdown */}
          <div className="searchable-selector">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Stethoscope className="w-3.5 h-3.5" />
              Bác sĩ
            </label>
            <SearchableSelector
              options={doctors}
              selectedId={doctorId}
              onChange={setDoctorId}
              placeholder={t('form.selectDoctor')}
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
                Đã chọn: <span className="font-medium text-gray-700">{selectedDoctor.name}</span>
              </div>
            )}
          </div>

          {/* Phụ tá - Optional */}
          <div className="searchable-selector">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              Phụ tá (không bắt buộc)
            </label>
            <SearchableSelector
              options={assistants}
              selectedId={assistantId}
              onChange={(id) => setAssistantId(id)}
              placeholder="Chọn phụ tá..."
              icon={<User className="w-4 h-4" />}
              renderOption={(emp) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-600 font-semibold text-xs">
                    {emp.avatar}
                  </div>
                  <div>
                    <p className="font-medium">{emp.name}</p>
                    <p className="text-xs text-gray-400">{emp.locationName}</p>
                  </div>
                </div>
              )}
            />
          </div>

          {/* Trợ lý bác sĩ - Optional */}
          <div className="searchable-selector">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              Trợ lý bác sĩ (không bắt buộc)
            </label>
            <SearchableSelector
              options={dentalAides}
              selectedId={dentalAideId}
              onChange={(id) => setDentalAideId(id)}
              placeholder="Chọn trợ lý..."
              icon={<User className="w-4 h-4" />}
              renderOption={(emp) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center text-green-600 font-semibold text-xs">
                    {emp.avatar}
                  </div>
                  <div>
                    <p className="font-medium">{emp.name}</p>
                    <p className="text-xs text-gray-400">{emp.locationName}</p>
                  </div>
                </div>
              )}
            />
          </div>

          {/* Location - Luxurious Searchable Dropdown */}
          <div className="searchable-selector">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              Chi nhánh
            </label>
            <SearchableSelector
              options={locations}
              selectedId={locationId}
              onChange={setLocationId}
              placeholder={t('form.selectLocation')}
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
                Đã chọn: <span className="font-medium text-gray-700">{selectedLocation.name}</span>
              </div>
            )}
          </div>

          {/* Service - Searchable Dropdown from Catalog */}
          <div className="searchable-selector">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Stethoscope className="w-3.5 h-3.5" />
              Dịch vụ
            </label>
            <SearchableSelector
              options={services.filter(s => s.active !== false)}
              selectedId={serviceId}
              onChange={setServiceId}
              placeholder={t('convertToService.selectService')}
              icon={<Stethoscope className="w-4 h-4" />}
              renderOption={(service) => (
                <div>
                  <p className="font-medium">{service.name}</p>
                  {service.saleprice && (
                    <p className="text-xs text-gray-400">{parseInt(service.saleprice).toLocaleString('vi-VN')}đ</p>
                  )}
                </div>
              )}
            />
            {selectedService && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Đã chọn: <span className="font-medium text-gray-700">{selectedService.name}</span>
              </div>
            )}
          </div>

          {/* Estimated Duration & Customer Type Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Estimated Duration */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Thời gian dự kiến
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(parseInt(e.target.value) || 30)}
                  min={5}
                  max={300}
                  step={5}
                  className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
                />
                <span className="text-sm text-gray-500">phút</span>
              </div>
            </div>

            {/* Customer Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                Loại khách
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCustomerType('new')}
                  className={`
                    px-3 py-2.5 rounded-xl text-xs font-medium border transition-all duration-200
                    ${customerType === 'new'
                      ? 'bg-orange-100 text-orange-700 border-orange-300 ring-2 ring-orange-500/20'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                    }
                  `}
                >
                  Khách mới
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerType('returning')}
                  className={`
                    px-3 py-2.5 rounded-xl text-xs font-medium border transition-all duration-200
                    ${customerType === 'returning'
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300'
                    }
                  `}
                >
                  Tái khám
                </button>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Trạng thái
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
                  {t(s.label)}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection - Compact row of color dots */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" />
              Màu thẻ
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(APPOINTMENT_CARD_COLORS).map(([code, color]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setColorCode(code)}
                  className={`
                    group relative rounded-full transition-all duration-200 border-2
                    ${colorCode === code 
                      ? `border-gray-800 shadow-md scale-110` 
                      : 'border-transparent hover:border-gray-300 hover:scale-105'
                  }
                  `}
                  title={t(color.label)}
                >
                  {/* Color dot */}
                  <div className={`
                    w-8 h-8 rounded-full bg-gradient-to-br ${color.previewGradient}
                    flex items-center justify-center
                  `}>
                    {colorCode === code && (
                      <Check className="w-4 h-4 text-white drop-shadow-sm" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-gray-400">
              {t(APPOINTMENT_CARD_COLORS[colorCode]?.label ?? 'Default')}
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              Ghi chú
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t('form.notes')}
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
            Hủy bỏ
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
                Đang lưu...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Lưu thay đổi
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
