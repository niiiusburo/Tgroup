import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  FileText,
  Plus,
  Phone,
} from 'lucide-react';

import { CustomerSelector } from '@/components/shared/CustomerSelector';
import { LocationSelector } from '@/components/shared/LocationSelector';
import { DatePicker } from '@/components/ui/DatePicker';
import { TimePicker } from '@/components/ui/TimePicker';
import { AddCustomerForm } from '@/components/forms/AddCustomerForm/AddCustomerForm';
import { useCustomers } from '@/hooks/useCustomers';
import { useEmployees } from '@/hooks/useEmployees';
import { useLocations } from '@/hooks/useLocations';
import { useProducts } from '@/hooks/useProducts';
import { useLocationFilter } from '@/contexts/LocationContext';
import type { AppointmentType } from '@/constants';
import type { Customer, CustomerFormData } from '@/types/customer';
import type { Product } from '@/hooks/useProducts';
import type { ServiceCatalogItem } from '@/types/service';
import { AppointmentDurationField } from './AppointmentDurationField';
import { AppointmentAppearanceFields } from './AppointmentAppearanceFields';
import { AppointmentStaffFields } from './AppointmentStaffFields';
import { AppointmentServiceFields } from './AppointmentServiceFields';

import type {
  AppointmentFormCoreProps,
} from './appointmentForm.types';

export function AppointmentFormCore({
  mode,
  data,
  onChange,
  customerReadOnly,
  errors,
  employees: employeesProp,
}: AppointmentFormCoreProps) {
  const { t } = useTranslation();
  const { allLocations, isLoading: locationsLoading } = useLocations();
  const { customers, createCustomer, loading: customersLoading } = useCustomers();
  const { employees: fetchedEmployees, isLoading: employeesLoading } = useEmployees();
  const employees = employeesProp ?? fetchedEmployees;
  const { selectedLocationId } = useLocationFilter();
  const { products: serviceCatalog, isLoading: productsLoading } = useProducts({ limit: 500 });
  const staffLoading = employeesProp ? false : employeesLoading;

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

  return (
    <div className="space-y-5">
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
                loading={customersLoading}
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
            loading={locationsLoading}
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

        <AppointmentDurationField
          value={data.estimatedDuration}
          error={errors.estimatedDuration}
          onChange={(estimatedDuration) => onChange({ estimatedDuration })}
        />
      </div>

      <AppointmentStaffFields employees={employees} data={data} onChange={onChange} loading={staffLoading} />

      <AppointmentServiceFields
        catalog={serviceCatalogItems}
        selectedServiceId={data.serviceId}
        appointmentType={data.appointmentType}
        onServiceChange={(itemId) => {
          const product = serviceCatalog.find((p) => p.id === itemId);
          handleServiceChange(product || null);
        }}
        onTypeChange={handleTypeChange}
        loading={productsLoading}
      />

      {/* Color + Status (edit only) */}
      <AppointmentAppearanceFields
        mode={mode}
        color={data.color}
        status={data.status}
        onColorChange={(color) => onChange({ color })}
        onStatusChange={(status) => onChange({ status })}
      />

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
