/**
 * ServiceForm - Create/edit service record modal form with real API data
 * @crossref:used-in[Services, Appointments]
 * @crossref:uses[ServiceCatalogSelector, CustomerSelector, DoctorSelector, DatePicker]
 * @crossref:matches[EditAppointmentModal styling]
 */

import { useState, useEffect } from 'react';
import { X, ClipboardPlus, Edit2, User, Stethoscope, MapPin, CalendarDays, Clock, FileText, DollarSign, Hash, Check } from 'lucide-react';
import { ServiceCatalogSelector } from '@/components/shared/ServiceCatalogSelector';
import { CustomerSelector } from '@/components/shared/CustomerSelector';
import { DoctorSelector } from '@/components/shared/DoctorSelector';
import { LocationSelector } from '@/components/shared/LocationSelector';
import { DatePicker } from '@/components/ui/DatePicker';
import { useCustomers } from '@/hooks/useCustomers';
import { useEmployees } from '@/hooks/useEmployees';
import { useLocations } from '@/hooks/useLocations';
import { MOCK_SERVICE_CATALOG, type ServiceCatalogItem } from '@/data/mockServices';
import type { CreateServiceInput } from '@/hooks/useServices';
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

interface ServiceFormProps {
  readonly onSubmit: (data: CreateServiceInput) => void;
  readonly onClose: () => void;
  readonly initialData?: Partial<CreateServiceInput>;
  readonly isEdit?: boolean;
}

export function ServiceForm({ onSubmit, onClose, initialData, isEdit = false }: ServiceFormProps) {
  // Fetch real data from API
  const { customers: apiCustomers, loading: customersLoading } = useCustomers();
  const { employees: apiEmployees, isLoading: employeesLoading } = useEmployees();
  const { allLocations: apiLocations, isLoading: locationsLoading } = useLocations();

  // Form state
  const [catalogItemId, setCatalogItemId] = useState<string | null>(initialData?.catalogItemId ?? null);
  const [customerId, setCustomerId] = useState<string | null>(initialData?.customerId ?? null);
  const [doctorId, setDoctorId] = useState<string | null>(initialData?.doctorId ?? null);
  const [locationId, setLocationId] = useState<string | null>(initialData?.locationId ?? null);
  const [startDate, setStartDate] = useState(initialData?.startDate ?? '');
  const [expectedEndDate, setExpectedEndDate] = useState(initialData?.expectedEndDate ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [toothInput, setToothInput] = useState(initialData?.toothNumbers?.join(', ') ?? '');
  const [totalCostOverride, setTotalCostOverride] = useState(
    initialData?.totalCost ? String(initialData.totalCost) : ''
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync with initialData when editing
  useEffect(() => {
    if (initialData) {
      setCatalogItemId(initialData.catalogItemId ?? null);
      setCustomerId(initialData.customerId ?? null);
      setDoctorId(initialData.doctorId ?? null);
      setLocationId(initialData.locationId ?? null);
      setStartDate(initialData.startDate ?? '');
      setExpectedEndDate(initialData.expectedEndDate ?? '');
      setNotes(initialData.notes ?? '');
      setToothInput(initialData.toothNumbers?.join(', ') ?? '');
      setTotalCostOverride(initialData.totalCost ? String(initialData.totalCost) : '');
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

  const selectedCatalog: ServiceCatalogItem | undefined = MOCK_SERVICE_CATALOG.find(
    (c) => c.id === catalogItemId,
  );

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!catalogItemId) newErrors.service = 'Service is required';
    if (!customerId) newErrors.customer = 'Customer is required';
    if (!doctorId) newErrors.doctor = 'Doctor is required';
    if (!locationId) newErrors.location = 'Location is required';
    if (!startDate) newErrors.startDate = 'Start date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const customer = customers.find((c) => c.id === customerId);
    const doctor = employees.find((emp) => emp.id === doctorId);
    const location = locations.find((l) => l.id === locationId);

    if (!customer || !doctor || !location || !selectedCatalog) return;

    const cost = totalCostOverride
      ? Number(totalCostOverride)
      : selectedCatalog.defaultPrice;

    const toothNumbers = toothInput
      ? toothInput.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    onSubmit({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      catalogItemId: selectedCatalog.id,
      serviceName: selectedCatalog.name,
      category: selectedCatalog.category,
      doctorId: doctor.id,
      doctorName: doctor.name,
      locationId: location.id,
      locationName: location.name,
      totalVisits: selectedCatalog.totalVisits,
      totalCost: cost,
      startDate,
      expectedEndDate: expectedEndDate || startDate,
      notes: notes.trim(),
      toothNumbers,
    });
  }

  const isLoading = customersLoading || employeesLoading || locationsLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header with gradient */}
        <div className="relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                {isEdit ? (
                  <Edit2 className="w-5 h-5 text-white" />
                ) : (
                  <ClipboardPlus className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {isEdit ? 'Edit Service Record' : 'New Service Record'}
                </h2>
                <p className="text-sm text-orange-100 mt-0.5">
                  {isEdit ? 'Update treatment details' : 'Create a new service treatment'}
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

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-2" />
              Loading...
            </div>
          )}

          {/* Service Catalog */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Stethoscope className="w-3.5 h-3.5" />
              Service
            </label>
            <ServiceCatalogSelector
              catalog={MOCK_SERVICE_CATALOG}
              selectedId={catalogItemId}
              onChange={setCatalogItemId}
            />
            {errors.service && <p className="mt-2 text-xs text-red-500">{errors.service}</p>}
            {selectedCatalog && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{selectedCatalog.totalVisits} visit{selectedCatalog.totalVisits > 1 ? 's' : ''} · ~{selectedCatalog.estimatedDuration}min each</span>
              </div>
            )}
          </div>

          {/* Customer */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              Customer
            </label>
            <CustomerSelector
              customers={customers}
              selectedId={customerId}
              onChange={setCustomerId}
            />
            {errors.customer && <p className="mt-2 text-xs text-red-500">{errors.customer}</p>}
          </div>

          {/* Doctor */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Stethoscope className="w-3.5 h-3.5" />
              Doctor
            </label>
            <DoctorSelector
              employees={employees}
              selectedId={doctorId}
              onChange={setDoctorId}
              filterRoles={['dentist', 'orthodontist']}
            />
            {errors.doctor && <p className="mt-2 text-xs text-red-500">{errors.doctor}</p>}
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              Location
            </label>
            <LocationSelector
              locations={locations}
              selectedId={locationId}
              onChange={setLocationId}
              excludeAll
            />
            {errors.location && <p className="mt-2 text-xs text-red-500">{errors.location}</p>}
          </div>

          {/* Dates - Custom DatePickers */}
          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              label="Start Date"
              icon={<CalendarDays className="w-3.5 h-3.5" />}
              error={errors.startDate}
            />
            <DatePicker
              value={expectedEndDate}
              onChange={setExpectedEndDate}
              label="Expected End"
              icon={<Clock className="w-3.5 h-3.5" />}
              minDate={startDate}
            />
          </div>

          {/* Cost and Tooth */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5" />
                Total Cost
              </label>
              <input
                type="number"
                value={totalCostOverride}
                onChange={(e) => setTotalCostOverride(e.target.value)}
                placeholder={selectedCatalog ? String(selectedCatalog.defaultPrice) : '0'}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
              />
              {selectedCatalog && (
                <p className="mt-1 text-xs text-gray-400">
                  Default: {new Intl.NumberFormat('vi-VN').format(selectedCatalog.defaultPrice)} VND
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Hash className="w-3.5 h-3.5" />
                Tooth Numbers
              </label>
              <input
                type="text"
                value={toothInput}
                onChange={(e) => setToothInput(e.target.value)}
                placeholder="e.g. #11, #21"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
              />
            </div>
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
              placeholder="Treatment notes..."
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-5 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/25"
          >
            <Check className="w-4 h-4" />
            {isEdit ? 'Update Service Record' : 'Create Service Record'}
          </button>
        </div>
      </div>
    </div>
  );
}
