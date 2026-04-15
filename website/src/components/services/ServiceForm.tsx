/**
 * ServiceForm - Create/edit service record modal form with real API data
 * @crossref:used-in[Services, Appointments]
 * @crossref:uses[ServiceCatalogSelector, CustomerSelector, DoctorSelector, LocationSelector, DatePicker]
 * @crossref:matches[AddCustomerForm DESIGN STANDARD]
 *
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║  FORM FAMILY — @crossref:related[]                                     ║
 * ╠════════════════════════════════════════════════════════════════════════╣
 * ║  @crossref:related[AppointmentForm] — SISTER FORM                      ║
 * ║    • Header/footer/label/input styling MUST match                      ║
 * ║    • Shared selectors (CustomerSelector, DoctorSelector, etc.)         ║
 * ║                                                                        ║
 * ║  @crossref:related[PaymentForm] — SISTER FORM                          ║
 * ║    • Same design standard, same shared components                      ║
 * ║                                                                        ║
 * ║  @crossref:related[EmployeeForm] — SISTER FORM                         ║
 * ║    • Same design standard                                              ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ClipboardPlus, Edit2, User, Stethoscope, MapPin, CalendarDays, Clock, FileText, DollarSign, Hash, Check } from 'lucide-react';

import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { ServiceCatalogSelector } from '@/components/shared/ServiceCatalogSelector';
import { CustomerSelector } from '@/components/shared/CustomerSelector';
import { DoctorSelector } from '@/components/shared/DoctorSelector';
import { LocationSelector } from '@/components/shared/LocationSelector';
import { DatePicker } from '@/components/ui/DatePicker';
import { useCustomers } from '@/hooks/useCustomers';
import { useEmployees } from '@/hooks/useEmployees';
import { useLocations } from '@/hooks/useLocations';
import { useProducts } from '@/hooks/useProducts';
import { type ServiceCatalogItem } from '@/data/mockServices';
import type { CreateServiceInput } from '@/hooks/useServices';
import type { Customer } from '@/types/customer';
import type { Employee } from '@/types/employee';
import type { Product } from '@/hooks/useProducts';
import type { AppointmentType } from '@/constants';

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
  readonly customerId?: string | null;
  readonly onSubmit: (data: CreateServiceInput) => void;
  readonly onClose: () => void;
  readonly initialData?: Partial<CreateServiceInput>;
  readonly isEdit?: boolean;
}

export function ServiceForm({ customerId: readonlyCustomerId, onSubmit, onClose, initialData, isEdit = false }: ServiceFormProps) {
  const { t } = useTranslation('services');
  const { t: tc } = useTranslation('common');
  const { customers: apiCustomers, loading: customersLoading } = useCustomers();
  const { employees: apiEmployees, isLoading: employeesLoading } = useEmployees();
  const { allLocations: apiLocations, isLoading: locationsLoading } = useLocations();
  const { products, isLoading: productsLoading } = useProducts({ limit: 1000 });

  const isProfileContext = Boolean(readonlyCustomerId);

  // Form state
  const [catalogItemId, setCatalogItemId] = useState<string | null>(initialData?.catalogItemId ?? null);
  const [customerId, setCustomerId] = useState<string | null>(initialData?.customerId ?? readonlyCustomerId ?? null);
  const [customerName, setCustomerName] = useState(initialData?.customerName ?? '');
  const [customerPhone, setCustomerPhone] = useState(initialData?.customerPhone ?? '');
  const [doctorId, setDoctorId] = useState<string | null>(initialData?.doctorId ?? null);
  const [assistantId, setAssistantId] = useState<string | null>(initialData?.assistantId ?? null);
  const [dentalAideId, setDentalAideId] = useState<string | null>(initialData?.dentalAideId ?? null);
  const [locationId, setLocationId] = useState<string | null>(initialData?.locationId ?? null);
  const [startDate, setStartDate] = useState(initialData?.startDate ?? '');
  const [expectedEndDate, setExpectedEndDate] = useState(initialData?.expectedEndDate ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [quantity, setQuantity] = useState(initialData?.quantity ? String(initialData.quantity) : '1');
  const [unit, setUnit] = useState(initialData?.unit ?? 'răng');
  const [totalCostOverride, setTotalCostOverride] = useState(
    initialData?.totalCost ? String(initialData.totalCost) : ''
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setCatalogItemId(initialData.catalogItemId ?? null);
      setCustomerId(initialData.customerId ?? readonlyCustomerId ?? null);
      setCustomerName(initialData.customerName ?? '');
      setCustomerPhone(initialData.customerPhone ?? '');
      setDoctorId(initialData.doctorId ?? null);
      setAssistantId(initialData.assistantId ?? null);
      setDentalAideId(initialData.dentalAideId ?? null);
      setLocationId(initialData.locationId ?? null);
      setStartDate(initialData.startDate ?? '');
      setExpectedEndDate(initialData.expectedEndDate ?? '');
      setNotes(initialData.notes ?? '');
      setQuantity(initialData.quantity ? String(initialData.quantity) : '1');
      setUnit(initialData.unit ?? 'răng');
      setTotalCostOverride(initialData.totalCost ? String(initialData.totalCost) : '');
    }
  }, [initialData?.id, readonlyCustomerId]);

  useEffect(() => {
    if (isProfileContext && readonlyCustomerId && apiCustomers.length > 0) {
      const customer = apiCustomers.find(c => c.id === readonlyCustomerId);
      if (customer) {
        setCustomerId(customer.id);
        setCustomerName(customer.name);
        setCustomerPhone(customer.phone);
      }
    }
  }, [readonlyCustomerId, apiCustomers, isProfileContext]);

  const customers: Customer[] = apiCustomers.map(c => ({
    id: c.id, name: c.name, phone: c.phone, email: c.email,
    locationId: c.locationId, status: c.status, lastVisit: c.lastVisit,
  }));

  const employees: Employee[] = apiEmployees.map(e => ({
    id: e.id, name: e.name,
    avatar: e.avatar || e.name.charAt(0).toUpperCase(),
    tier: (e.tier as Employee['tier']) || 'mid',
    roles: (e.roles as Employee['roles']) || ['doctor'],
    status: (e.status as Employee['status']) || 'active',
    locationId: e.locationId || '', locationName: e.locationName || '',
    phone: e.phone || '', email: e.email || '', schedule: e.schedule || [],
    linkedEmployeeIds: e.linkedEmployeeIds || [], hireDate: e.hireDate || '',
  }));

  const locations: Location[] = apiLocations.map(l => ({
    id: l.id, name: l.name, address: l.address || '', phone: l.phone || '',
    status: (l.status as Location['status']) || 'active',
    doctorCount: 0, patientCount: 0, appointmentCount: 0,
  }));

  const serviceCatalog: ServiceCatalogItem[] = useMemo(() =>
    products.map((p: Product) => ({
      id: p.id, name: p.name,
      category: (p.categoryName?.toLowerCase().includes('ortho') ? 'orthodontics' :
                 p.categoryName?.toLowerCase().includes('cosmetic') ? 'cosmetic' :
                 p.categoryName?.toLowerCase().includes('surgery') ? 'surgery' :
                 p.categoryName?.toLowerCase().includes('clean') ? 'cleaning' :
                 p.categoryName?.toLowerCase().includes('consult') ? 'consultation' :
                 p.categoryName?.toLowerCase().includes('emergency') ? 'emergency' :
                 'treatment') as AppointmentType,
      description: p.categoryName || 'Dental service',
      defaultPrice: p.listPrice,
      estimatedDuration: 30,
      totalVisits: 1,
      unit: p.uomName || undefined,
    })),
    [products]
  );

  const selectedCatalog = serviceCatalog.find(c => c.id === catalogItemId);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!catalogItemId) newErrors.service = t('formErrors.selectService', 'Vui lòng chọn dịch vụ');
    if (!customerId) newErrors.customer = t('formErrors.selectCustomer', 'Vui lòng chọn khách hàng');
    if (!doctorId) newErrors.doctor = t('formErrors.selectDoctor', 'Vui lòng chọn bác sĩ');
    if (!locationId) newErrors.location = t('formErrors.selectLocation', 'Vui lòng chọn chi nhánh');
    if (!startDate) newErrors.startDate = t('formErrors.selectStartDate', 'Vui lòng chọn ngày bắt đầu');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Clear field-specific errors when values change
  const handleCatalogChange = (id: string | null) => {
    setCatalogItemId(id);
    if (id) {
      setErrors(prev => { const next = { ...prev }; delete next.service; return next; });
      const catalogItem = serviceCatalog.find(c => c.id === id);
      if (catalogItem?.unit) setUnit(catalogItem.unit);
    }
  };
  const handleCustomerChange = (id: string | null) => {
    setCustomerId(id);
    const customer = customers.find(c => c.id === id);
    if (customer) {
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone);
    }
    if (id) setErrors(prev => { const next = { ...prev }; delete next.customer; return next; });
  };
  const handleDoctorChange = (id: string | null) => {
    setDoctorId(id);
    if (id) setErrors(prev => { const next = { ...prev }; delete next.doctor; return next; });
  };
  const handleAssistantChange = (id: string | null) => {
    setAssistantId(id);
  };
  const handleDentalAideChange = (id: string | null) => {
    setDentalAideId(id);
  };
  const handleLocationChange = (id: string | null) => {
    setLocationId(id);
    if (id) setErrors(prev => { const next = { ...prev }; delete next.location; return next; });
  };
  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    if (date) setErrors(prev => { const next = { ...prev }; delete next.startDate; return next; });
  };

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!validate()) return;

    const customer = customers.find(c => c.id === customerId) ||
      (customerId ? { id: customerId, name: customerName, phone: customerPhone } : undefined);
    const doctor = employees.find(emp => emp.id === doctorId);
    const assistant = employees.find(emp => emp.id === assistantId);
    const dentalAide = employees.find(emp => emp.id === dentalAideId);
    const location = locations.find(l => l.id === locationId);
    if (!customer || !doctor || !location || !selectedCatalog) return;

    const cost = totalCostOverride ? Number(totalCostOverride) : selectedCatalog.defaultPrice;

    setIsSaving(true);
    try {
      await onSubmit({
      ...(initialData?.id ? { id: initialData.id } : {}),
      customerId: customer.id, customerName: customer.name, customerPhone: customer.phone,
      catalogItemId: selectedCatalog.id, serviceName: selectedCatalog.name,
      category: selectedCatalog.category, doctorId: doctor.id, doctorName: doctor.name,
      assistantId: assistant?.id ?? null, assistantName: assistant?.name ?? '',
      dentalAideId: dentalAide?.id ?? null, dentalAideName: dentalAide?.name ?? '',
      locationId: location.id, locationName: location.name,
      totalVisits: selectedCatalog.totalVisits, totalCost: cost,
      startDate, expectedEndDate: expectedEndDate || startDate,
      notes: notes.trim(), quantity: Number(quantity) || 1, unit: unit.trim(),
      toothNumbers: [],
    });
    } catch (error) {
      setErrors(prev => ({ ...prev, submit: error instanceof Error ? error.message : t('formErrors.saveFailed', 'Lưu thất bại') }));
    } finally {
      setIsSaving(false);
    }
  }

  const isLoading = customersLoading || employeesLoading || locationsLoading || productsLoading;

  return (
    <div className="modal-container z-[100]">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-content animate-in zoom-in-95 duration-200 max-w-3xl">
        {/* Header */}
        <div className="modal-header relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                {isEdit ? <Edit2 className="w-5 h-5 text-white" /> : <ClipboardPlus className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{isEdit ? t('editService') : t('addService')}</h2>
                <p className="text-sm text-orange-100 mt-0.5">
                  {isEdit ? t('form.subtitleEdit', 'Cập nhật thông tin điều trị') : t('form.subtitleCreate', 'Tạo hồ sơ dịch vụ điều trị mới')}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-body px-6 py-6 space-y-5">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-2" />
              {tc('loading')}
            </div>
          )}

          {/* Dịch vụ */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Stethoscope className="w-3.5 h-3.5" />
              {t('columns.name')}
            </label>
            <ServiceCatalogSelector catalog={serviceCatalog} selectedId={catalogItemId} onChange={handleCatalogChange} placeholder={t('convertToService.selectService', { ns: 'appointments' })} />
            {errors.service && <p className="mt-2 text-xs text-red-500">{errors.service}</p>}
            {selectedCatalog && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{selectedCatalog.totalVisits} {t('visits')} · ~{selectedCatalog.estimatedDuration} {t('minutesPerVisit')}</span>
              </div>
            )}
          </div>

          {/* Khách hàng */}
          {!isProfileContext && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                {t('form.customer', 'Khách hàng')}
              </label>
              <CustomerSelector customers={customers} selectedId={customerId} onChange={handleCustomerChange} />
              {errors.customer && <p className="mt-2 text-xs text-red-500">{errors.customer}</p>}
            </div>
          )}

          {/* Bác sĩ */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Stethoscope className="w-3.5 h-3.5" />
              {t('form.doctor', 'Bác sĩ')}
            </label>
            <DoctorSelector employees={employees} selectedId={doctorId} onChange={handleDoctorChange} filterRoles={['doctor']} />
            {errors.doctor && <p className="mt-2 text-xs text-red-500">{errors.doctor}</p>}
          </div>

          {/* Phụ tá */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              {t('form.assistant', 'Phụ tá')}
            </label>
            <DoctorSelector employees={employees} selectedId={assistantId} onChange={handleAssistantChange} filterRoles={['assistant']} placeholder={t('form.selectDoctor', { ns: 'appointments' })} />
          </div>

          {/* Trợ lý Bác sĩ */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              {t('form.dentalAide', 'Trợ lý Bác sĩ')}
            </label>
            <DoctorSelector employees={employees} selectedId={dentalAideId} onChange={handleDentalAideChange} filterRoles={['doctor-assistant']} placeholder={t('form.selectDoctor', { ns: 'appointments' })} />
          </div>

          {/* Chi nhánh */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              {t('form.location', 'Chi nhánh')}
            </label>
            <LocationSelector locations={locations} selectedId={locationId} onChange={handleLocationChange} excludeAll />
            {errors.location && <p className="mt-2 text-xs text-red-500">{errors.location}</p>}
          </div>

          {/* Ngày bắt đầu + Ngày kết thúc */}
          <div className="grid grid-cols-2 gap-4">
            <DatePicker value={startDate} onChange={handleStartDateChange} label={t('form.startDate', 'Ngày bắt đầu')} icon={<CalendarDays className="w-3.5 h-3.5" />} error={errors.startDate} />
            <DatePicker value={expectedEndDate} onChange={setExpectedEndDate} label={t('form.endDate', 'Ngày kết thúc')} icon={<Clock className="w-3.5 h-3.5" />} minDate={startDate} />
          </div>

          {/* Chi phí + Số lượng + Đơn vị */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5" />
                {t('totalCost')}
              </label>
              <CurrencyInput
                value={totalCostOverride ? Number(totalCostOverride) : null}
                onChange={(v) => setTotalCostOverride(v === null ? '' : String(v))}
                placeholder={selectedCatalog ? String(selectedCatalog.defaultPrice) : '0'}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
              />
              {selectedCatalog && (
                <p className="mt-1 text-xs text-gray-400">
                  {t('default', 'Mặc định')}: {new Intl.NumberFormat('vi-VN').format(selectedCatalog.defaultPrice)} VND
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Hash className="w-3.5 h-3.5" />
                {t('form.quantity', 'Số lượng')}
              </label>
              <input
                type="number" value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                min={1}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                {t('form.unit', 'Đơn vị')}
              </label>
              <input
                type="text" value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder={t('form.unitPlaceholder', 'răng')}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
              />
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              {t('form.notes', { ns: 'appointments' })}
            </label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={3} placeholder={t('enterNotes', 'Nhập ghi chú')}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="modal-footer px-6 py-5 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
              {tc('cancel')}
            </button>
            <button type="button" onClick={() => handleSubmit()} disabled={isLoading || isSaving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/25">
              <Check className="w-4 h-4" />
              {isEdit ? tc('update') : t('addService')}
            </button>
          </div>
      </div>
    </div>
  );
}
