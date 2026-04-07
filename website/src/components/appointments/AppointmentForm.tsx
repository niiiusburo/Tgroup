/**
 * AppointmentForm - Create/edit appointment form
 * @crossref:used-in[Appointments, Calendar, Overview]
 * @crossref:uses[CustomerSelector, DoctorSelector, LocationSelector]
 */

import { useState } from 'react';
import { X, CalendarPlus } from 'lucide-react';
import { CustomerSelector } from '@/components/shared/CustomerSelector';
import { DoctorSelector } from '@/components/shared/DoctorSelector';
import { LocationSelector } from '@/components/shared/LocationSelector';
import { MOCK_CUSTOMERS } from '@/data/mockCustomers';
import { MOCK_EMPLOYEES } from '@/data/mockEmployees';
import { MOCK_LOCATIONS } from '@/data/mockDashboard';
import { APPOINTMENT_TYPE_LABELS, TIME_SLOTS, type AppointmentType } from '@/constants';

interface AppointmentFormProps {
  readonly onSubmit: (data: AppointmentFormData) => void;
  readonly onClose: () => void;
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

const APPOINTMENT_TYPES = Object.keys(APPOINTMENT_TYPE_LABELS) as AppointmentType[];

export function AppointmentForm({ onSubmit, onClose }: AppointmentFormProps) {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('consultation');
  const [serviceName, setServiceName] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

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

    const customer = MOCK_CUSTOMERS.find((c) => c.id === customerId);
    const doctor = MOCK_EMPLOYEES.find((emp) => emp.id === doctorId);
    const location = MOCK_LOCATIONS.find((l) => l.id === locationId);

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">New Appointment</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <CustomerSelector
              customers={MOCK_CUSTOMERS}
              selectedId={customerId}
              onChange={setCustomerId}
            />
            {errors.customer && <p className="text-xs text-red-500 mt-1">{errors.customer}</p>}
          </div>

          {/* Doctor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
            <DoctorSelector
              employees={MOCK_EMPLOYEES}
              selectedId={doctorId}
              onChange={setDoctorId}
              filterRoles={['dentist', 'orthodontist']}
            />
            {errors.doctor && <p className="text-xs text-red-500 mt-1">{errors.doctor}</p>}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <LocationSelector
              locations={MOCK_LOCATIONS}
              selectedId={locationId}
              onChange={setLocationId}
              excludeAll
            />
            {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
          </div>

          {/* Type and Service */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value as AppointmentType)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                {APPOINTMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {APPOINTMENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
              <input
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. Teeth Cleaning"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
              {errors.serviceName && <p className="text-xs text-red-500 mt-1">{errors.serviceName}</p>}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="">Select...</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
              {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <select
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="">Select...</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
              {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime}</p>}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
            >
              Create Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
