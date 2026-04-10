import { useState, useEffect } from 'react';
import { X, User, Phone, Stethoscope, UserCheck, CalendarPlus } from 'lucide-react';
import { fetchEmployees, fetchProducts, createPartner, createAppointment, createSaleOrder } from '@/lib/api';
import type { ApiEmployee, ApiProduct } from '@/lib/api';

/**
 * WalkInForm - Minimal walk-in patient modal
 * Creates a customer + appointment (arrived) + optional sale order in one flow.
 * @crossref:used-in[Overview]
 */

export interface WalkInFormProps {
  readonly locationId?: string;
  readonly locationName?: string;
  readonly onSuccess?: () => void;
  readonly onCancel: () => void;
}

interface FormState {
  name: string;
  phone: string;
  doctorId: string;
  doctorName: string;
  serviceId: string;
  serviceName: string;
}

function inputClass(hasError: boolean) {
  return [
    'w-full px-4 py-3 bg-white border rounded-xl text-sm transition-all',
    'focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400',
    hasError ? 'border-red-300' : 'border-gray-200',
    'hover:border-gray-300',
  ].join(' ');
}

function selectClass() {
  return [
    'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm',
    'focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400',
    'transition-all appearance-none hover:border-gray-300',
  ].join(' ');
}

function FieldLabel({ children, icon: Icon, required }: { children: React.ReactNode; icon?: React.ElementType; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
      {required && <span className="text-red-500">*</span>}
    </label>
  );
}

export function WalkInForm({ locationId, locationName, onSuccess, onCancel }: WalkInFormProps) {
  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    doctorId: '',
    doctorName: '',
    serviceId: '',
    serviceName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doctors, setDoctors] = useState<ApiEmployee[]>([]);
  const [services, setServices] = useState<ApiProduct[]>([]);

  useEffect(() => {
    fetchEmployees({ limit: 200, isDoctor: true })
      .then((r) => setDoctors(r.items.filter((e) => e.isdoctor)))
      .catch(() => {});
    fetchProducts({ limit: 200 })
      .then((r) => setServices(r.items))
      .catch(() => {});
  }, []);

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Vui lòng nhập tên';
    if (!form.phone.trim()) next.phone = 'Vui lòng nhập số điện thoại';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      // 1. Create customer
      const customer = await createPartner({
        name: form.name.trim(),
        phone: form.phone.trim(),
        companyid: locationId || undefined,
        customer: true,
        status: true,
      });

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const nowStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

      // 2. Create appointment for today with state arrived
      await createAppointment({
        partnerid: customer.id,
        partnername: customer.name,
        partnerphone: customer.phone || '',
        doctorid: form.doctorId || undefined,
        doctorname: form.doctorName || undefined,
        companyid: locationId || customer.companyid || undefined,
        companyname: locationName || undefined,
        date: todayStr,
        time: nowStr,
        name: form.serviceName || 'Khám tổng quát',
        state: 'confirmed',
        note: 'Khách vãng lai',
      });

      // 3. Optionally create sale order if service selected
      if (form.serviceId) {
        await createSaleOrder({
          partnerid: customer.id,
          partnername: customer.name,
          companyid: locationId || customer.companyid || undefined,
          productid: form.serviceId,
          productname: form.serviceName,
          doctorid: form.doctorId || undefined,
          doctorname: form.doctorName || undefined,
        });
      }

      onSuccess?.();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Walk-in failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col bg-white overflow-hidden rounded-2xl" style={{ width: '90vw', maxWidth: '480px', maxHeight: '90vh' }}>
      {/* Header */}
      <div className="relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 flex-shrink-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Tiếp nhận khách vãng lai</h2>
              <p className="text-sm text-orange-100 mt-0.5">Tạo nhanh hồ sơ + lịch hẹn hôm nay</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
          {/* Name */}
          <div>
            <FieldLabel icon={User} required>Họ và tên</FieldLabel>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="Nhập họ và tên"
              className={inputClass(!!errors.name)}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Phone */}
          <div>
            <FieldLabel icon={Phone} required>Số điện thoại</FieldLabel>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              placeholder="0901 111 222"
              className={inputClass(!!errors.phone)}
            />
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
          </div>

          {/* Doctor */}
          <div>
            <FieldLabel icon={Stethoscope}>Bác sĩ</FieldLabel>
            <div className="relative">
              <select
                value={form.doctorId}
                onChange={(e) => {
                  const id = e.target.value;
                  const name = doctors.find((d) => d.id === id)?.name || '';
                  setForm((prev) => ({ ...prev, doctorId: id, doctorName: name }));
                }}
                className={`${selectClass()} pl-3`}
              >
                <option value="">-- Chọn bác sĩ --</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Service */}
          <div>
            <FieldLabel icon={CalendarPlus}>Dịch vụ</FieldLabel>
            <div className="relative">
              <select
                value={form.serviceId}
                onChange={(e) => {
                  const id = e.target.value;
                  const name = services.find((s) => s.id === id)?.name || '';
                  setForm((prev) => ({ ...prev, serviceId: id, serviceName: name }));
                }}
                className={`${selectClass()} pl-3`}
              >
                <option value="">-- Chọn dịch vụ (tuỳ chọn) --</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-gray-200 flex-shrink-0 bg-gradient-to-b from-gray-50 to-white flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            Đóng
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu và tiếp nhận'}
          </button>
        </div>
      </form>
    </div>
  );
}
