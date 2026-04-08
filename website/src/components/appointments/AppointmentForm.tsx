/**
 * AppointmentForm - Create/edit appointment form with real API data
 * @crossref:used-in[Appointments, Calendar, Overview]
 * @crossref:uses[CustomerSelector, DoctorSelector, LocationSelector, DatePicker, TimePicker]
 */

import { useState, useEffect } from 'react';
import { X, CalendarPlus, Edit2, Calendar, Clock } from 'lucide-react';
import { CustomerSelector } from '@/components/shared/CustomerSelector';
import { DoctorSelector } from '@/components/shared/DoctorSelector';
import { LocationSelector } from '@/components/shared/LocationSelector';
import { DatePicker } from '@/components/ui/DatePicker';
import { TimePicker } from '@/components/ui/TimePicker';
import { useCustomers } from '@/hooks/useCustomers';
import { useEmployees } from '@/hooks/useEmployees';
import { useLocations } from '@/hooks/useLocations';
import { APPOINTMENT_TYPE_LABELS, type AppointmentType } from '@/constants';
import type { Customer } from '@/data/mockCustomers';
import type { Employee } from '@/data/mockEmployees';
interface Location {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: 'active' | 'inactive';
  doctorCount: number;
  patientCount: number;
  appointmentCount: number;
}

export interface AppointmentFormData {
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly doctorId: string;
  readonly doctorName: string;
  readonly locationId: string;
  readonly locationName: string;
  readonly appointmentType: AppointmentType;
  readonly serviceName: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly notes: string;
}

interface AppointmentFormProps {
  readonly onSubmit: (data: AppointmentFormData) => void;
  readonly onClose: () => void;
  readonly initialData?: Partial<AppointmentFormData>;
  readonly isEdit?: boolean;
}

const APPOINTMENT_TYPES = Object.keys(APPOINTMENT_TYPE_LABELS) as AppointmentType[];

export function AppointmentForm({ onSubmit, onClose, initialData, isEdit = false }: AppointmentFormProps) {
  // Fetch real data from API
  const { customers: apiCustomers, loading: customersLoading } = useCustomers();
  const { employees: apiEmployees, isLoading: employeesLoading } = useEmployees();
  const { allLocations: apiLocations, isLoading: locationsLoading } = useLocations();

  // Form state
  const [customerId, setCustomerId] = useState<string | null>(initialData?.customerId ?? null);
  const [doctorId, setDoctorId] = useState<string | null>(initialData?.doctorId ?? null);
  const [locationId, setLocationId] = useState<string | null>(initialData?.locationId ?? null);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('consultation');
  const [serviceName, setServiceName] = useState(initialData?.serviceName ?? '');
  const [date, setDate] = useState(initialData?.date ?? '');
  const [startTime, setStartTime] = useState(initialData?.startTime ?? '');
  const [endTime, setEndTime] = useState(initialData?.endTime ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync with initialData when editing
  useEffect(() => {
    if (initialData) {
      setCustomerId(initialData.customerId ?? null);
      setDoctorId(initialData.doctorId ?? null);
      setLocationId(initialData.locationId ?? null);
      setServiceName(initialData.serviceName ?? '');
      setDate(initialData.date ?? '');
      setStartTime(initialData.startTime ?? '');
      setEndTime(initialData.endTime ?? '');
      setNotes(initialData.notes ?? '');
    }
  }, [initialData]);

  // Convert API data to selector format
  const customers: Customer[] = apiCustomers.map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    locationId: c.locationId,
    status: c.status,
    lastVisit: c.lastVisit,
  }));

  const employees: Employee[] = apiEmployees.map(e => ({
    id: e.id,
    name: e.name,
    avatar: e.avatar || e.name.charAt(0).toUpperCase(),
    tier: (e.tier as Employee['tier']) || 'mid',
    roles: (e.roles as Employee['roles']) || ['dentist'],
    status: (e.status as Employee['status']) || 'active',
    locationId: e.locationId || '',
    locationName: e.locationName || '',
    phone: e.phone || '',
    email: e.email || '',
    schedule: e.schedule || [],
    linkedEmployeeIds: e.linkedEmployeeIds || [],
    hireDate: e.hireDate || '',
  }));

  const locations: Location[] = apiLocations.map(l => ({
    id: l.id,
    name: l.name,
    address: l.address || '',
    phone: l.phone || '',
    status: (l.status as Location['status']) || 'active',
    doctorCount: 0,
    patientCount: 0,
    appointmentCount: 0,
  }));

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!customerId) newErrors.customer = 'Customer is required';
    if (!doctorId) newErrors.doctor = 'Doctor is required';
    if (!locationId) newErrors.location = 'Location is required';
    if (!date) newErrors.date = 'Date is required';
    if (!startTime) newErrors.startTime = 'Start time is required';
    if (!endTime) newErrors.endTime = 'End time is required';
    if (!serviceName.trim()) newErrors.serviceName = 'Service name is required';
    if (startTime && endTime && startTime >= endTime) {
      newErrors.endTime = 'End time must be after start time';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const customer = customers.find((c) => c.id === customerId);
    const doctor = employees.find((emp) => emp.id === doctorId);
    const location = locations.find((l) => l.id === locationId);

    if (!customer || !doctor || !location) return;

    onSubmit({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      doctorId: doctor.id,
      doctorName: doctor.name,
      locationId: location.id,
      locationName: location.name,
      appointmentType,
      serviceName: serviceName.trim(),
      date,
      startTime,
      endTime,
      notes: notes.trim(),
    });
  }

  const isLoading = customersLoading || employeesLoading || locationsLoading;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with gradient */}
        <div className="relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 shrink-0">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                {isEdit ? (
                  <Edit2 className="w-5 h-5 text-white" />
                ) : (
                  <CalendarPlus className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {isEdit ? 'Edit Appointment' : 'New Appointment'}
                </h2>
                <p className="text-sm text-orange-100 mt-0.5">
                  {isEdit ? 'Update appointment details' : 'Schedule a new appointment'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-2" />
              Loading data...
            </div>
          )}

          {/* Customer */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Customer
            </label>
            <CustomerSelector
              customers={customers}
              selectedId={customerId}
              onChange={setCustomerId}
            />
            {errors.customer && <p className="text-xs text-red-500 mt-1">{errors.customer}</p>}
          </div>

          {/* Doctor */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Doctor
            </label>
            <DoctorSelector
              employees={employees}
              selectedId={doctorId}
              onChange={setDoctorId}
              filterRoles={['dentist', 'orthodontist']}
            />
            {errors.doctor && <p className="text-xs text-red-500 mt-1">{errors.doctor}</p>}
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Location
            </label>
            <LocationSelector
              locations={locations}
              selectedId={locationId}
              onChange={setLocationId}
              excludeAll
            />
            {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
          </div>

          {/* Type and Service */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Type
              </label>
              <select
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value as AppointmentType)}
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 bg-white"
              >
                {APPOINTMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {APPOINTMENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Service Name
              </label>
              <input
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. Teeth Cleaning"
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              />
              {errors.serviceName && <p className="text-xs text-red-500 mt-1">{errors.serviceName}</p>}
            </div>
          </div>

          {/* Date - Custom DatePicker */}
          <DatePicker
            value={date}
            onChange={setDate}
            label="Date"
            icon={<Calendar className="w-3.5 h-3.5" />}
            error={errors.date}
          />

          {/* Time - Custom TimePickers */}
          <div className="grid grid-cols-2 gap-3">
            <TimePicker
              value={startTime}
              onChange={setStartTime}
              label="Start Time"
              icon={<Clock className="w-3.5 h-3.5" />}
              error={errors.startTime}
              interval={15}
            />
            <TimePicker
              value={endTime}
              onChange={setEndTime}
              label="End Time"
              icon={<Clock className="w-3.5 h-3.5" />}
              minTime={startTime}
              error={errors.endTime}
              interval={15}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes..."
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-5 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/25"
          >
            {isEdit ? 'Update Appointment' : 'Create Appointment'}
          </button>
        </div>
      </div>
    </div>
  );
}
