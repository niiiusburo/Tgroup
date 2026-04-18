/**
 * AppointmentForm - Create/edit appointment form with real API data
 * @crossref:used-in[Appointments, Calendar, Overview]
 * @crossref:uses[CustomerSelector, DoctorSelector, LocationSelector, ServiceCatalogSelector, DatePicker, TimePicker]
 *
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║  APPOINTMENT MODULE FAMILY — @crossref:related[]                       ║
 * ╠════════════════════════════════════════════════════════════════════════╣
 * ║  This component is the CREATE variant of the appointment module.       ║
 * ║  When editing this file, you MUST also check:                          ║
 * ║                                                                        ║
 * ║  @crossref:related[EditAppointmentModal]  — EDIT variant               ║
 * ║    • Color picker, STATUS_OPTIONS, selectors must be consistent         ║
 * ║    • Uses APPOINTMENT_CARD_COLORS from constants (DO NOT duplicate)     ║
 * ║                                                                        ║
 * ║  @crossref:related[AppointmentDetailsModal] — VIEW variant             ║
 * ║    • Status labels must match STATUS_OPTIONS                           ║
 * ║                                                                        ║
 * ║  @crossref:related[TodayAppointments] — LIST variant                   ║
 * ║    • Card colors come from APPOINTMENT_CARD_COLORS in constants         ║
 * ║                                                                        ║
 * ║  @crossref:color-source[constants/index.ts APPOINTMENT_CARD_COLORS]    ║
 * ║    • Single source of truth for all color codes 0-7                    ║
 * ║    • DO NOT create local APPOINTMENT_COLORS maps                       ║
 * ║                                                                        ║
 * ║  @crossref:related[ServiceForm, PaymentForm] — SISTER FORMS            ║
 * ║    • Header/footer/label/input styling must match DESIGN STANDARD       ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 *
 * ═══ DESIGN STANDARD ═══
 * AddCustomerForm.tsx is the canonical GOLD STANDARD for all TG Clinic modal forms.
 * This appointment form must stay visually identical to that standard:
 *   - modal-container + modal-content wrapper
 *   - Orange gradient header with icon, Vietnamese title, subtitle, X button
 *   - modal-body for scrollable content
 *   - Labels: text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 with icon
 *   - Inputs: px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-orange-500/20
 *   - Grid layouts for paired fields
 *   - Gradient footer with "Hủy bỏ" + primary action button
 *   - Vietnamese labels throughout
 * ═══════════════════════
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { X, CalendarPlus, Edit2, Calendar, Clock, User, Stethoscope, MapPin, FileText, Palette, Check, Plus } from 'lucide-react';
import { CustomerSelector } from '@/components/shared/CustomerSelector';
import { DoctorSelector } from '@/components/shared/DoctorSelector';
import { LocationSelector } from '@/components/shared/LocationSelector';
import { ServiceCatalogSelector } from '@/components/shared/ServiceCatalogSelector';
import { DatePicker } from '@/components/ui/DatePicker';
import { TimePicker } from '@/components/ui/TimePicker';
import { useCustomers } from '@/hooks/useCustomers';
import { AddCustomerForm } from '@/components/forms/AddCustomerForm/AddCustomerForm';
import { useEmployees } from '@/hooks/useEmployees';
import { useLocations } from '@/hooks/useLocations';
import { useProducts } from '@/hooks/useProducts';
import { useLocationFilter } from '@/contexts/LocationContext';
import { useTimezone } from '@/contexts/TimezoneContext';
import { toISODateString } from '@/lib/dateUtils';
import type { ServiceCatalogItem } from '@/types/service';
import { APPOINTMENT_CARD_COLORS, APPOINTMENT_STATUS_OPTIONS } from '@/constants';
import type { AppointmentType } from '@/constants';
import type { Customer } from '@/types/customer';
import type { Employee } from '@/types/employee';
import type { Product } from '@/hooks/useProducts';
import { useTranslation } from 'react-i18next';

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

// Status options imported from constants — single source of truth
const STATUS_OPTIONS = APPOINTMENT_STATUS_OPTIONS;

export interface AppointmentFormData {
  readonly id?: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly doctorId?: string;
  readonly doctorName?: string;
  readonly assistantId?: string;
  readonly assistantName?: string;
  readonly dentalAideId?: string;
  readonly dentalAideName?: string;
  readonly locationId: string;
  readonly locationName: string;
  readonly appointmentType: AppointmentType;
  readonly serviceName: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly notes: string;
  readonly estimatedDuration?: number;
  readonly customerType?: 'new' | 'returning';
  readonly serviceId?: string;
  readonly status?: string;
  readonly color?: string;
}

interface AppointmentFormProps {
  readonly onSubmit: (data: AppointmentFormData) => void;
  readonly onClose: () => void;
  readonly initialData?: Partial<AppointmentFormData>;
  readonly isEdit?: boolean;
}

function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getCurrentTimeStr() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function AppointmentForm({ onSubmit, onClose, initialData, isEdit = false }: AppointmentFormProps) {
  const { t } = useTranslation('appointments');
  const { selectedLocationId } = useLocationFilter();
  const { getToday } = useTimezone();

  // Fetch real data from API
  const { customers: apiCustomers, loading: customersLoading, createCustomer } = useCustomers();
  const { employees: apiEmployees, isLoading: employeesLoading } = useEmployees();
  const { allLocations: apiLocations, isLoading: locationsLoading } = useLocations();
  const { products, isLoading: productsLoading } = useProducts({ limit: 1000 });

  const fallbackLocationId = selectedLocationId && selectedLocationId !== 'all' ? selectedLocationId : null;

  // Form state
  const [customerId, setCustomerId] = useState<string | null>(initialData?.customerId ?? null);
  const [doctorId, setDoctorId] = useState<string | null>(initialData?.doctorId ?? null);
  const [assistantId, setAssistantId] = useState<string | null>(initialData?.assistantId ?? null);
  const [dentalAideId, setDentalAideId] = useState<string | null>(initialData?.dentalAideId ?? null);
  const [locationId, setLocationId] = useState<string | null>(initialData?.locationId ?? (isEdit ? null : fallbackLocationId));
  const [serviceId, setServiceId] = useState<string | null>(initialData?.serviceId ?? null);
  const [serviceName, setServiceName] = useState(initialData?.serviceName ?? '');
  const [customerType, setCustomerType] = useState<'new' | 'returning'>(initialData?.customerType ?? 'new');
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [estimatedDuration, setEstimatedDuration] = useState<number>(initialData?.estimatedDuration ?? 30);
  const [date, setDate] = useState(() => {
    const normalized = toISODateString(initialData?.date);
    return normalized || (isEdit ? '' : getToday());
  });
  const [startTime, setStartTime] = useState(() => initialData?.startTime ?? (isEdit ? '' : getCurrentTimeStr()));
  const [endTime, setEndTime] = useState(initialData?.endTime ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [status, setStatus] = useState(initialData?.status ?? 'scheduled');
  const [colorCode, setColorCode] = useState(initialData?.color ?? '0');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sync with initialData when editing
  useEffect(() => {
    if (initialData) {
      setCustomerId(initialData.customerId ?? null);
      setDoctorId(initialData.doctorId ?? null);
      setAssistantId(initialData.assistantId ?? null);
      setDentalAideId(initialData.dentalAideId ?? null);
      setLocationId(initialData.locationId ?? null);
      setServiceId(initialData.serviceId ?? null);
      setServiceName(initialData.serviceName ?? '');
      setCustomerType(initialData.customerType ?? 'new');
      setEstimatedDuration(initialData.estimatedDuration ?? 30);
      const normalizedDate = toISODateString(initialData.date);
      setDate(normalizedDate || (isEdit ? '' : getToday()));
      setStartTime(initialData.startTime ?? '');
      setEndTime(initialData.endTime ?? '');
      setNotes(initialData.notes ?? '');
      setStatus(initialData.status ?? 'scheduled');
      setColorCode(initialData.color ?? '0');
    }
  }, [initialData?.id]);

  // When customer selection changes, auto-populate their registered location
  const prevCustomerIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (customerId && customerId !== prevCustomerIdRef.current) {
      const customer = apiCustomers.find((c) => c.id === customerId);
      if (customer?.locationId) {
        setLocationId(customer.locationId);
      }
    }
    prevCustomerIdRef.current = customerId;
  }, [customerId, apiCustomers]);

  // Convert API data to selector format
  const customers: Customer[] = apiCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    locationId: c.locationId,
    status: c.status,
    lastVisit: c.lastVisit
  }));

  const employees: Employee[] = apiEmployees.map((e) => ({
    id: e.id,
    name: e.name,
    avatar: e.avatar || e.name.charAt(0).toUpperCase(),
    tierId: (e as any).tierId || '',
    tierName: (e as any).tierName || 'No Tier',
    roles: e.roles as Employee['roles'] || ['doctor'],
    status: e.status as Employee['status'] || 'active',
    locationId: e.locationId || '',
    locationName: e.locationName || '',
    phone: e.phone || '',
    email: e.email || '',
    schedule: e.schedule || [],
    linkedEmployeeIds: e.linkedEmployeeIds || [],
    hireDate: e.hireDate || ''
  }));

  const locations: Location[] = apiLocations.map((l) => ({
    id: l.id,
    name: l.name,
    address: l.address || '',
    phone: l.phone || '',
    status: l.status as Location['status'] || 'active',
    doctorCount: 0,
    patientCount: 0,
    appointmentCount: 0
  }));

  // Map real products to ServiceCatalogItem format
  const serviceCatalog: ServiceCatalogItem[] = useMemo(() =>
  products.map((p: Product) => ({
    id: p.id,
    name: p.name,
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
    unit: p.uomName || undefined
  })),
  [products]
  );

  const selectedService = serviceCatalog.find((s) => s.id === serviceId);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!customerId) newErrors.customer = t('form.selectPatient');
    // Doctor is optional for appointments
    if (!locationId) newErrors.location = t('form.selectLocation');
    if (!date) newErrors.date = t('form.date');
    if (!startTime) newErrors.startTime = t('form.startTime');
    // endTime is optional — only validate if provided
    if (endTime && startTime && endTime <= startTime) {
      newErrors.endTime = t('form.endTime');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!validate()) return;

    const customer = customers.find((c) => c.id === customerId);
    const doctor = employees.find((emp) => emp.id === doctorId);
    const assistant = employees.find((emp) => emp.id === assistantId);
    const dentalAide = employees.find((emp) => emp.id === dentalAideId);
    const location = locations.find((l) => l.id === locationId);

    if (!customer || !location) return;

    // Auto-calculate endTime from startTime + estimatedDuration if not provided
    let computedEndTime = endTime;
    if (!computedEndTime && startTime && estimatedDuration) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + estimatedDuration;
      const endHours = Math.floor(totalMinutes / 60) % 24;
      const endMins = totalMinutes % 60;
      computedEndTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
    }

    setIsSaving(true);
    setSubmitError(null);
    try {
      await onSubmit({
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        doctorId: doctor?.id,
        doctorName: doctor?.name,
        assistantId: assistant?.id || undefined,
        assistantName: assistant?.name || undefined,
        dentalAideId: dentalAide?.id || undefined,
        dentalAideName: dentalAide?.name || undefined,
        locationId: location.id,
        locationName: location.name,
        appointmentType: selectedService?.category ?? 'consultation',
        serviceName: selectedService?.name || serviceName.trim(),
        date,
        startTime,
        endTime: computedEndTime,
        notes: notes.trim(),
        estimatedDuration,
        customerType,
        serviceId: serviceId || undefined,
        status,
        color: colorCode
      });
    } catch (error: any) {
      console.error('Appointment save failed:', error);
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        error?.errors?.[0]?.message ||
        'Không thể lưu lịch hẹn. Vui lòng thử lại.';
      setSubmitError(msg);
    } finally {
      setIsSaving(false);
    }
  }

  const isLoading = customersLoading || employeesLoading || locationsLoading;
  const isProductsLoading = productsLoading;

  return (
    <div className="modal-container">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="modal-content animate-in zoom-in-95 duration-200 max-w-[900px]">
        {/* Header with gradient */}
        <div className="modal-header relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                {isEdit ? <Edit2 className="w-5 h-5 text-white" /> : <CalendarPlus className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {isEdit ? t('editAppointment') : t('addAppointment')}
                </h2>
                <p className="text-sm text-orange-100 mt-0.5">
                  {isEdit ? t('editAppointment') : t('addAppointment')}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="modal-body px-6 py-6">
          {isLoading &&
          <div className="flex items-center justify-center py-8 text-gray-400">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-2" />

          </div>
          }

          <div className="grid grid-cols-2 gap-6">
            {/* ── LEFT: Thông tin cơ bản ── */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold text-gray-800 pb-2 border-b border-gray-100 flex items-center gap-2">
                <User className="w-4 h-4 text-orange-500" />

              </h3>

              {/* Khách hàng */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  {t('form.patient')}
                </label>
                {isEdit ?
                <div className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border bg-gray-50 border-gray-200 text-gray-700">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="flex-1 truncate font-medium">{initialData?.customerName || t('form.selectPatient')}</span>
                    <span className="text-xs text-gray-400">{initialData?.customerPhone}</span>
                  </div> :

                <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <CustomerSelector customers={customers} selectedId={customerId} onChange={setCustomerId} onCreateNew={() => setShowCreateCustomer(true)} />
                    </div>
                    <button
                    type="button"
                    onClick={() => setShowCreateCustomer(true)}
                    title={t("thmKhchHngMi")}
                    className="flex-shrink-0 p-2.5 text-orange-600 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors">
                    
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                }
                {errors.customer && <p className="text-xs text-red-500 mt-1">{errors.customer}</p>}
              </div>

              {/* Bác sĩ */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Stethoscope className="w-3.5 h-3.5" />
                  {t('form.doctorOptional')}
                </label>
                <DoctorSelector employees={employees} selectedId={doctorId} onChange={setDoctorId} filterRoles={['doctor']} placeholder={t("chnBcS")} allowClear />
              </div>

              {/* Phụ tá - Optional */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />

                </label>
                <DoctorSelector employees={employees} selectedId={assistantId} onChange={setAssistantId} filterRoles={['assistant']} placeholder={t("chnPhT")} allowClear />
              </div>

              {/* Trợ lý bác sĩ - Optional */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />

                </label>
                <DoctorSelector employees={employees} selectedId={dentalAideId} onChange={setDentalAideId} filterRoles={['doctor-assistant']} placeholder={t("chnTrL")} allowClear />
              </div>

              {/* Chi nhánh */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  {t('form.location')}
                </label>
                <LocationSelector locations={locations} selectedId={locationId} onChange={setLocationId} excludeAll />
                {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
              </div>

              {/* Ngày hẹn */}
              <DatePicker
                value={date}
                onChange={setDate}
                label={t('form.date')}
                icon={<Calendar className="w-3.5 h-3.5" />}
                error={errors.date} />
              

              {/* Giờ bắt đầu + Thời gian dự kiến */}
              <div className="grid grid-cols-2 gap-3">
                <TimePicker
                  value={startTime}
                  onChange={setStartTime}
                  label={t('form.startTime')}
                  icon={<Clock className="w-3.5 h-3.5" />}
                  error={errors.startTime}
                  interval={15} />
                
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    {t('form.endTime')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={estimatedDuration}
                      onChange={(e) => setEstimatedDuration(parseInt(e.target.value) || 30)}
                      min={5} max={300} step={5}
                      className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm" />
                    
                    <span className="text-sm text-gray-500">{t('common.minutes')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Thông tin nâng cao ── */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold text-gray-800 pb-2 border-b border-gray-100 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-orange-500" />
                {t('label.highInfo')}
              </h3>

              {/* Dịch vụ */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Stethoscope className="w-3.5 h-3.5" />
                  {t('label.service')}
                </label>
                {isProductsLoading ?
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500">
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />

                </div> :

                <ServiceCatalogSelector
                  catalog={serviceCatalog}
                  selectedId={serviceId}
                  onChange={setServiceId}
                  placeholder={t("chnDchV")} />

                }
                {selectedService &&
                <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {selectedService.totalVisits}{selectedService.estimatedDuration} {t('common.minutes')}
                  </p>
                }
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  {t('form.notes')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder={t('form.notes')}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm resize-none" />
                
              </div>

              {/* Loại khách */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  {t('form.selectStatus')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerType('new')}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all duration-200 ${
                    customerType === 'new' ?
                    'bg-orange-100 text-orange-700 border-orange-300 ring-2 ring-orange-500/20' :
                    'bg-white border-gray-200 text-gray-600 hover:border-orange-300'}`
                    }>
                    
                    {t('customer.type.new')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerType('returning')}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all duration-200 ${
                    customerType === 'returning' ?
                    'bg-emerald-100 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20' :
                    'bg-white border-gray-200 text-gray-600 hover:border-emerald-300'}`
                    }>
                    
                    {t('customer.type.returning')}
                  </button>
                </div>
              </div>

              {/* Màu thẻ */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5" />
                  {t('label.cardColor')}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {Object.entries(APPOINTMENT_CARD_COLORS).map(([code, color]) =>
                  <button
                    key={code}
                    type="button"
                    onClick={() => setColorCode(code)}
                    className={`
                        group relative rounded-full transition-all duration-200 border-2
                        ${colorCode === code ?
                    'border-gray-800 shadow-md scale-110' :
                    'border-transparent hover:border-gray-300 hover:scale-105'}
                      `
                    }
                    title={t(color.label)}>
                    
                      <div className={`
                        w-8 h-8 rounded-full bg-gradient-to-br ${color.previewGradient}
                        flex items-center justify-center
                      `}>
                        {colorCode === code &&
                      <Check className="w-4 h-4 text-white drop-shadow-sm" />
                      }
                      </div>
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400">
                  {t(APPOINTMENT_CARD_COLORS[colorCode]?.label ?? 'default')}
                </p>
              </div>

              {/* Trạng thái (edit mode only) */}
              {isEdit &&
              <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {t('form.status')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {STATUS_OPTIONS.map((s) =>
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatus(s.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-200 ${
                    status === s.value ?
                    `${s.color} ring-2 ring-offset-1 ring-orange-500/30 shadow-sm` :
                    'bg-white border-gray-200 text-gray-600 hover:border-orange-300'}`
                    }>
                    
                        {t(s.label)}
                      </button>
                  )}
                  </div>
                </div>
              }
            </div>
          </div>

          {/* ── Nhắc lịch hẹn ── */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 pb-2 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              {t('label.reminder')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
              { label: t('reminder.15'), value: '15min' },
              { label: t('reminder.30'), value: '30min' },
              { label: t('reminder.1h'), value: '1h' },
              { label: t('reminder.1d'), value: '1d' },
              { label: 'SMS', value: 'sms' },
              { label: 'Zalo', value: 'zalo' }].
              map((reminder) =>
              <button
                key={reminder.value}
                type="button"
                className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:border-orange-300 hover:bg-orange-50 transition-colors">
                
                  {reminder.label}
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-400">{t('tnhNngNhcLchSCKchHotSau')}</p>
          </div>
        </form>

        {submitError && (
          <div className="px-6 pt-3 text-sm text-red-700 bg-red-50 border-t border-red-200">
            <b>Lỗi: </b>{submitError}
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer px-6 py-5 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
            

          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isLoading || isSaving}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all disabled:opacity-50 shadow-lg shadow-orange-500/25">
            
            {isEdit ? t("cpNht") : t('addAppointment')}
          </button>
        </div>
      </div>

      {/* Quick-add customer modal */}
      {showCreateCustomer &&
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden">
            <AddCustomerForm
            onSubmit={async (data) => {
              const created = await createCustomer(data);
              setCustomerId(created.id);
              setShowCreateCustomer(false);
            }}
            onCancel={() => setShowCreateCustomer(false)} />
          
          </div>
        </div>
      }
    </div>);

}