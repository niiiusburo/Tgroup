/**
 * AppointmentFormCore — The actual form fields.
 *
 * This component knows NOTHING about modals, API calls, or pages.
 * It only renders form fields and calls onChange when the user edits.
 *
 * Used by: AppointmentFormShell (modal wrapper)
 * Can also be embedded inline on any page if needed.
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  MapPin,
  FileText,
  Palette,
  Plus,
  ChevronDown,
  Phone,
} from 'lucide-react';

import { CustomerSelector } from '@/components/shared/CustomerSelector';
import { DoctorSelector } from '@/components/shared/DoctorSelector';
import { LocationSelector } from '@/components/shared/LocationSelector';
import { ServiceCatalogSelector } from '@/components/shared/ServiceCatalogSelector';
import { DatePicker } from '@/components/ui/DatePicker';
import { TimePicker } from '@/components/ui/TimePicker';
import { AddCustomerForm } from '@/components/forms/AddCustomerForm/AddCustomerForm';
import { useCustomers } from '@/hooks/useCustomers';
import { useEmployees } from '@/hooks/useEmployees';
import { useLocations } from '@/hooks/useLocations';
import { useProducts } from '@/hooks/useProducts';
import { useLocationFilter } from '@/contexts/LocationContext';
import { APPOINTMENT_CARD_COLORS, APPOINTMENT_STATUS_OPTIONS } from '@/constants';
import type { AppointmentType } from '@/constants';
import type { Customer, CustomerFormData } from '@/types/customer';
import type { Employee } from '@/types/employee';
import type { Product } from '@/hooks/useProducts';
import type { ServiceCatalogItem } from '@/types/service';

import type {
  AppointmentFormCoreProps,
  UnifiedAppointmentFormData,
} from './appointmentForm.types';

const APPOINTMENT_TYPES: AppointmentType[] = [
  'cleaning',
  'consultation',
  'treatment',
  'surgery',
  'orthodontics',
  'cosmetic',
  'emergency',
];

export function AppointmentFormCore({
  mode,
  data,
  onChange,
  customerReadOnly,
  errors,
  employees: employeesProp,
}: AppointmentFormCoreProps) {
  const { t } = useTranslation();
  const { allLocations } = useLocations();
  const { customers, createCustomer } = useCustomers();
  const { employees: fetchedEmployees } = useEmployees();
  const employees = employeesProp ?? fetchedEmployees;
  const { selectedLocationId } = useLocationFilter();
  const { products: serviceCatalog } = useProducts({ limit: 500 });

  // Map Product[] to ServiceCatalogItem[] for the selector
  const serviceCatalogItems: ServiceCatalogItem[] = useMemo(
    () =>
      serviceCatalog.map((p) => ({
        id: p.id,
        name: p.name,
        category: (p.type as AppointmentType) || 'treatment',
        description: p.categoryName || '',
        defaultPrice: p.listPrice,
        estimatedDuration: data.estimatedDuration ?? 30,
        totalVisits: 1,
        unit: p.uomName || undefined,
      })),
    [serviceCatalog, data.estimatedDuration]
  );

  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const isEdit = mode === 'edit';

  // ─── Handlers ───────────────────────────────────────────────────

  const handleCustomerChange = (customer: Customer | null) => {
    if (!customer) return;
    onChange({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone || '',
      locationId: customer.locationId || selectedLocationId || data.locationId,
      locationName:
        allLocations.find((l) => l.id === (customer.locationId || selectedLocationId))?.name ||
        data.locationName,
    });
  };

  const handleDoctorChange = (doctor: Employee | null) => {
    onChange({
      doctorId: doctor?.id,
      doctorName: doctor?.name,
    });
  };

  const handleLocationChange = (locationId: string) => {
    const location = allLocations.find((l) => l.id === locationId);
    onChange({
      locationId,
      locationName: location?.name || '',
    });
  };

  const handleServiceChange = (product: Product | null) => {
    onChange({
      serviceId: product?.id,
      serviceName: product?.name || '',
      estimatedDuration: data.estimatedDuration,
    });
  };

  const handleTypeChange = (type: AppointmentType) => {
    onChange({ appointmentType: type });
  };

  const handleColorChange = (colorCode: string) => {
    onChange({ color: colorCode });
    setColorDropdownOpen(false);
  };

  const handleStatusChange = (status: string) => {
    onChange({ status: status as UnifiedAppointmentFormData['status'] });
    setStatusDropdownOpen(false);
  };

  // TODO: implement inline customer creation
  // const handleNewCustomerCreated = (customer: Customer) => {
  //   setShowCreateCustomer(false);
  //   handleCustomerChange(customer);
  // };

  // ─── Render helpers ─────────────────────────────────────────────

  const colorConfig = data.color ? APPOINTMENT_CARD_COLORS[data.color] : APPOINTMENT_CARD_COLORS['1'];

  return (
    <div className="modal-body space-y-5">
      {/* Customer */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          <User className="w-3.5 h-3.5" />
          {t('appointments:form.customer')}
        </label>
        {customerReadOnly ? (
          <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700">
            <div className="font-medium">{data.customerName}</div>
            {data.customerPhone && (
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <Phone className="w-3 h-3" />
                {data.customerPhone}
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1">
              <CustomerSelector
                customers={customers}
                selectedId={data.customerId || null}
                onChange={(customerId) => {
                  const customer = customers.find((c) => c.id === customerId);
                  if (customer) handleCustomerChange(customer);
                }}
                placeholder={t('appointments:form.selectCustomer')}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCreateCustomer(true)}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 transition-colors"
              title={t('appointments:thmKhchHngMi', 'Thêm khách hàng mới')}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
        {errors.customerId && (
          <p className="text-xs text-red-500 mt-1">{errors.customerId}</p>
        )}
      </div>

      {/* Add Customer Modal */}
      {showCreateCustomer && (
        <AddCustomerForm
          onCancel={() => setShowCreateCustomer(false)}
          onSubmit={async (formData: CustomerFormData) => {
            const created = await createCustomer(formData);
            handleCustomerChange(created);
            setShowCreateCustomer(false);
          }}
        />
      )}

      {/* Location + Date + Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <MapPin className="w-3.5 h-3.5" />
            {t('appointments:form.location')}
          </label>
          <LocationSelector
            locations={allLocations.map((l) => ({ id: l.id, name: l.name }))}
            selectedId={data.locationId || null}
            onChange={handleLocationChange}
          />
          {errors.locationId && (
            <p className="text-xs text-red-500 mt-1">{errors.locationId}</p>
          )}
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <Calendar className="w-3.5 h-3.5" />
            {t('appointments:form.date')}
          </label>
          <DatePicker
            value={data.date}
            onChange={(date) => onChange({ date })}
          />
          {errors.date && (
            <p className="text-xs text-red-500 mt-1">{errors.date}</p>
          )}
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <Clock className="w-3.5 h-3.5" />
            {t('appointments:form.startTime')}
          </label>
          <TimePicker
            value={data.startTime}
            onChange={(time) => onChange({ startTime: time })}
          />
          {errors.startTime && (
            <p className="text-xs text-red-500 mt-1">{errors.startTime}</p>
          )}
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <Clock className="w-3.5 h-3.5" />
            {t('appointments:form.endTime')}
          </label>
          <input
            type="text"
            value={data.endTime}
            readOnly
            className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-500"
          />
          {errors.endTime && (
            <p className="text-xs text-red-500 mt-1">{errors.endTime}</p>
          )}
        </div>
      </div>

      {/* Doctor + Assistants */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <Stethoscope className="w-3.5 h-3.5" />
            {t('appointments:form.doctor')}
          </label>
          <DoctorSelector
            employees={employees}
            selectedId={data.doctorId || null}
            filterRoles={['doctor']}
            onChange={(employeeId) => {
              const emp = employees.find((e) => e.id === employeeId);
              handleDoctorChange(emp || null);
            }}
            placeholder={t('appointments:form.selectDoctor')}
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {t('appointments:form.assistant')}
          </label>
          <DoctorSelector
            employees={employees}
            selectedId={data.assistantId || null}
            filterRoles={['assistant']}
            onChange={(employeeId) => {
              const emp = employees.find((e) => e.id === employeeId);
              onChange({
                assistantId: emp?.id,
                assistantName: emp?.name,
              });
            }}
            placeholder={t('appointments:form.selectAssistant')}
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {t('appointments:form.dentalAide')}
          </label>
          <DoctorSelector
            employees={employees}
            selectedId={data.dentalAideId || null}
            filterRoles={['doctor-assistant']}
            onChange={(employeeId) => {
              const emp = employees.find((e) => e.id === employeeId);
              onChange({
                dentalAideId: emp?.id,
                dentalAideName: emp?.name,
              });
            }}
            placeholder={t('appointments:form.selectDentalAide')}
          />
        </div>
      </div>

      {/* Service */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          <Stethoscope className="w-3.5 h-3.5" />
          {t('appointments:form.service')}
        </label>
          <ServiceCatalogSelector
            catalog={serviceCatalogItems}
            selectedId={data.serviceId || null}
            onChange={(itemId) => {
              const product = serviceCatalog.find((p) => p.id === itemId);
              handleServiceChange(product || null);
            }}
            placeholder={t('appointments:form.selectService')}
          />
      </div>

      {/* Type pills */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {t('appointments:label.service')}
        </label>
        <div className="flex flex-wrap gap-2">
          {APPOINTMENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                data.appointmentType === type
                  ? 'bg-orange-100 text-orange-700 border border-orange-300'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {t(`calendar:appointmentTypes.${type}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Duration + Color + Status (edit only) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <Clock className="w-3.5 h-3.5" />
            {t('appointments:form.duration')}
          </label>
          <input
            type="number"
            min={5}
            max={300}
            value={data.estimatedDuration ?? 30}
            onChange={(e) => onChange({ estimatedDuration: Number(e.target.value) })}
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
          />
          {errors.estimatedDuration && (
            <p className="text-xs text-red-500 mt-1">{errors.estimatedDuration}</p>
          )}
        </div>

        <div className="relative">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <Palette className="w-3.5 h-3.5" />
            {t('appointments:label.cardColor')}
          </label>
          <button
            type="button"
            onClick={() => setColorDropdownOpen((v) => !v)}
            className={`w-full px-4 py-3 text-sm border rounded-xl flex items-center gap-2 transition-all ${colorConfig?.bgHighlight || 'bg-gray-50'} ${colorConfig?.border || 'border-gray-200'}`}
          >
            <span className={`w-4 h-4 rounded-full ${colorConfig?.dot?.replace('border-l-', 'bg-') || 'bg-gray-400'}`} />
            <span className="flex-1 text-left">{t(colorConfig?.label || 'common:colors.blue')}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {colorDropdownOpen && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-4 gap-2">
              {Object.entries(APPOINTMENT_CARD_COLORS).map(([code, config]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleColorChange(code)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                    data.color === code ? 'ring-2 ring-orange-400 bg-orange-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${config.previewGradient}`} />
                  <span className="text-[10px] text-gray-600">{t(config.label)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {isEdit && (
          <div className="relative">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {t('appointments:form.status')}
            </label>
            <button
              type="button"
              onClick={() => setStatusDropdownOpen((v) => !v)}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl flex items-center gap-2 bg-white"
            >
              <span className="flex-1 text-left capitalize">{data.status}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {statusDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1">
                {APPOINTMENT_STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleStatusChange(opt.value)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                      data.status === opt.value ? 'bg-orange-50 text-orange-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${opt.color.split(' ')[0].replace('bg-', 'bg-')}`} />
                    {t(opt.label)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          <FileText className="w-3.5 h-3.5" />
          {t('appointments:form.notes')}
        </label>
        <textarea
          value={data.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none"
          placeholder={t('appointments:form.enterNotes')}
        />
      </div>
    </div>
  );
}
