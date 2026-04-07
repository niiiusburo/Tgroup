/**
 * ServiceForm - Create/edit service record modal form
 * @crossref:used-in[Services, Appointments]
 * @crossref:uses[ServiceCatalogSelector, CustomerSelector, DoctorSelector]
 */

import { useState } from 'react';
import { X, ClipboardPlus } from 'lucide-react';
import { ServiceCatalogSelector } from '@/components/shared/ServiceCatalogSelector';
import { CustomerSelector } from '@/components/shared/CustomerSelector';
import { DoctorSelector } from '@/components/shared/DoctorSelector';
import { LocationSelector } from '@/components/shared/LocationSelector';
import { MOCK_SERVICE_CATALOG, type ServiceCatalogItem } from '@/data/mockServices';
import { MOCK_CUSTOMERS } from '@/data/mockCustomers';
import { MOCK_EMPLOYEES } from '@/data/mockEmployees';
import { MOCK_LOCATIONS } from '@/data/mockDashboard';
import type { CreateServiceInput } from '@/hooks/useServices';

interface ServiceFormProps {
  readonly onSubmit: (data: CreateServiceInput) => void;
  readonly onClose: () => void;
}

export function ServiceForm({ onSubmit, onClose }: ServiceFormProps) {
  const [catalogItemId, setCatalogItemId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [toothInput, setToothInput] = useState('');
  const [totalCostOverride, setTotalCostOverride] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

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

    const customer = MOCK_CUSTOMERS.find((c) => c.id === customerId);
    const doctor = MOCK_EMPLOYEES.find((emp) => emp.id === doctorId);
    const location = MOCK_LOCATIONS.find((l) => l.id === locationId);

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ClipboardPlus className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">New Service Record</h2>
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
          {/* Service Catalog */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
            <ServiceCatalogSelector
              catalog={MOCK_SERVICE_CATALOG}
              selectedId={catalogItemId}
              onChange={setCatalogItemId}
            />
            {errors.service && <p className="text-xs text-red-500 mt-1">{errors.service}</p>}
            {selectedCatalog && (
              <p className="text-xs text-gray-400 mt-1">
                {selectedCatalog.totalVisits} visit{selectedCatalog.totalVisits > 1 ? 's' : ''} &middot; ~{selectedCatalog.estimatedDuration}min each
              </p>
            )}
          </div>

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

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected End</label>
              <input
                type="date"
                value={expectedEndDate}
                onChange={(e) => setExpectedEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Cost and Tooth */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Cost {selectedCatalog && <span className="text-gray-400 font-normal">(default: {new Intl.NumberFormat('vi-VN').format(selectedCatalog.defaultPrice)})</span>}
              </label>
              <input
                type="number"
                value={totalCostOverride}
                onChange={(e) => setTotalCostOverride(e.target.value)}
                placeholder={selectedCatalog ? String(selectedCatalog.defaultPrice) : '0'}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tooth Numbers</label>
              <input
                type="text"
                value={toothInput}
                onChange={(e) => setToothInput(e.target.value)}
                placeholder="e.g. #11, #21"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Treatment notes..."
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
              Create Service Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
