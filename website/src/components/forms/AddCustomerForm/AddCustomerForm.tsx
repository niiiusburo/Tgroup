import { useState, useCallback, useEffect } from 'react';
import { X, Camera, Plus } from 'lucide-react';
import { fetchCompanies, fetchEmployees } from '@/lib/api';
import type { ApiCompany, ApiEmployee } from '@/lib/api';
import {
  EMPTY_CUSTOMER_FORM,
  validateCustomerForm,
  VIET_CITIES,
  VIET_DISTRICTS,
  VIET_WARDS,
  TITLE_OPTIONS,
  CUSTOMER_SOURCES,
} from '@/data/mockCustomerForm';
import type { CustomerFormData, FormValidationError } from '@/data/mockCustomerForm';

/**
 * AddCustomerForm - TDental "Thêm khách hàng" 2-column modal form
 * Supports both create and edit modes.
 * @crossref:used-in[Customers]
 */

interface AddCustomerFormProps {
  readonly initialData?: Partial<CustomerFormData>;
  readonly customerRef?: string | null;
  readonly onSubmit: (data: CustomerFormData) => void;
  readonly onCancel: () => void;
  readonly isEdit?: boolean;
}

type TabId = 'basic' | 'medical' | 'einvoice';

const TABS: { id: TabId; label: string }[] = [
  { id: 'basic', label: 'Thông tin cơ bản' },
  { id: 'medical', label: 'Tiểu sử bệnh' },
  { id: 'einvoice', label: 'Hóa đơn điện tử' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);

function inputClass(hasError: boolean, disabled = false) {
  return [
    'w-full px-3 py-1.5 rounded border text-sm transition-colors focus:outline-none focus:ring-1',
    hasError
      ? 'border-red-400 focus:ring-red-400'
      : 'border-gray-300 focus:ring-orange-400 focus:border-orange-400',
    disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white',
  ].join(' ');
}

function selectClass(disabled = false) {
  return [
    'w-full px-3 py-1.5 rounded border border-gray-300 text-sm bg-white',
    'focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400',
    disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : '',
  ].join(' ');
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs text-gray-500 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

export function AddCustomerForm({
  initialData,
  customerRef,
  onSubmit,
  onCancel,
  isEdit = false,
}: AddCustomerFormProps) {
  const [formData, setFormData] = useState<CustomerFormData>({
    ...EMPTY_CUSTOMER_FORM,
    ...(initialData ?? {}),
  });
  const [errors, setErrors] = useState<readonly FormValidationError[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameUppercase, setNameUppercase] = useState(false);

  // Dropdown data
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);

  useEffect(() => {
    fetchCompanies({ limit: 50 }).then((r) => setCompanies(r.items)).catch(() => {});
    fetchEmployees({ limit: 100 }).then((r) => setEmployees(r.items)).catch(() => {});
  }, []);

  // Sync when initialData changes (edit mode)
  useEffect(() => {
    setFormData({ ...EMPTY_CUSTOMER_FORM, ...(initialData ?? {}) });
  }, [initialData]);

  const getError = useCallback(
    (field: keyof CustomerFormData) => errors.find((e) => e.field === field)?.message,
    [errors],
  );

  const set = useCallback(
    <K extends keyof CustomerFormData>(field: K, value: CustomerFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => prev.filter((e) => e.field !== field));
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const validationErrors = validateCustomerForm(formData);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        // Switch to the tab containing the first error
        const firstErrorField = validationErrors[0].field;
        if (firstErrorField === 'medicalhistory') setActiveTab('medical');
        else if (['isbusinessinvoice', 'unitname', 'taxcode'].includes(firstErrorField)) setActiveTab('einvoice');
        else setActiveTab('basic');
        return;
      }
      setIsSubmitting(true);
      try {
        onSubmit(formData);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSubmit],
  );

  const districtsForCity = VIET_DISTRICTS[formData.cityname] ?? [];
  const wardsForDistrict = VIET_WARDS[formData.districtname] ?? [];

  const today = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-base font-semibold text-gray-900">
          {isEdit ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 overflow-hidden">
        {/* ── Left Panel ─────────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 border-r border-gray-200 flex flex-col gap-3 px-4 py-4 overflow-y-auto">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="relative w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50">
              {formData.photoUrl ? (
                <img src={formData.photoUrl} alt="avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <Camera className="w-7 h-7 text-gray-400" />
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <FieldLabel required>Họ và tên</FieldLabel>
              <button
                type="button"
                onClick={() => setNameUppercase((v) => !v)}
                className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                  nameUppercase
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-500 border-gray-300'
                }`}
              >
                IN HOA
              </button>
            </div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => set('name', nameUppercase ? e.target.value.toUpperCase() : e.target.value)}
              placeholder="Nhập họ và tên"
              disabled={isEdit}
              className={inputClass(!!getError('name'), isEdit)}
              style={nameUppercase ? { textTransform: 'uppercase' } : {}}
            />
            {getError('name') && <p className="mt-0.5 text-xs text-red-500">{getError('name')}</p>}
          </div>

          {/* Gender */}
          <div>
            <FieldLabel>Giới tính</FieldLabel>
            <div className="flex gap-3">
              {(['male', 'female', 'other'] as const).map((g) => (
                <label key={g} className={`flex items-center gap-1 text-sm cursor-pointer ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    checked={formData.gender === g}
                    onChange={() => !isEdit && set('gender', g)}
                    disabled={isEdit}
                    className="accent-orange-500"
                  />
                  {g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : 'Khác'}
                </label>
              ))}
            </div>
          </div>

          {/* Phone */}
          <div>
            <FieldLabel required>Số điện thoại</FieldLabel>
            <div className="flex gap-1">
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="0901 111 222"
                className={inputClass(!!getError('phone')) + ' flex-1'}
              />
              <button
                type="button"
                title="Số khẩn cấp"
                className="px-2 py-1.5 border border-gray-300 rounded text-gray-500 hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {getError('phone') && <p className="mt-0.5 text-xs text-red-500">{getError('phone')}</p>}
          </div>

          {/* Branch */}
          <div>
            <FieldLabel required>Chi nhánh</FieldLabel>
            <select
              value={formData.companyid}
              onChange={(e) => set('companyid', e.target.value)}
              className={selectClass()}
            >
              <option value="">-- Chọn chi nhánh --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {getError('companyid') && <p className="mt-0.5 text-xs text-red-500">{getError('companyid')}</p>}
          </div>

          {/* Sales staff */}
          <div>
            <FieldLabel>Nhân viên sale</FieldLabel>
            <select
              value={formData.salestaffid}
              onChange={(e) => set('salestaffid', e.target.value)}
              className={selectClass()}
            >
              <option value="">-- Chọn nhân viên --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          {/* Source */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <FieldLabel>Nguồn</FieldLabel>
              <button type="button" className="text-orange-500 hover:text-orange-600">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <select
              value={formData.sourceid}
              onChange={(e) => set('sourceid', e.target.value)}
              className={selectClass()}
            >
              <option value="">-- Chọn nguồn --</option>
              {CUSTOMER_SOURCES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Referral */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <FieldLabel>Người giới thiệu</FieldLabel>
              <button type="button" className="text-orange-500 hover:text-orange-600">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <select
              value={formData.referraluserid}
              onChange={(e) => set('referraluserid', e.target.value)}
              className={selectClass()}
            >
              <option value="">-- Chọn người giới thiệu --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <FieldLabel>Ghi chú</FieldLabel>
            <textarea
              value={formData.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="Ghi chú về khách hàng..."
              rows={3}
              className="w-full px-3 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400 resize-none"
            />
          </div>
        </div>

        {/* ── Right Panel ────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 flex-shrink-0 px-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {/* ── Tab: Basic Info ── */}
            {activeTab === 'basic' && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {/* DOB */}
                <div>
                  <FieldLabel>Ngày sinh</FieldLabel>
                  <div className="flex gap-1">
                    <select
                      value={formData.birthday ?? ''}
                      onChange={(e) => set('birthday', e.target.value ? Number(e.target.value) : null)}
                      disabled={isEdit}
                      className={`flex-1 ${selectClass(isEdit)}`}
                    >
                      <option value="">Ngày</option>
                      {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select
                      value={formData.birthmonth ?? ''}
                      onChange={(e) => set('birthmonth', e.target.value ? Number(e.target.value) : null)}
                      disabled={isEdit}
                      className={`flex-1 ${selectClass(isEdit)}`}
                    >
                      <option value="">Tháng</option>
                      {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select
                      value={formData.birthyear ?? ''}
                      onChange={(e) => set('birthyear', e.target.value ? Number(e.target.value) : null)}
                      disabled={isEdit}
                      className={`flex-1 ${selectClass(isEdit)}`}
                    >
                      <option value="">Năm</option>
                      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                {/* Created date */}
                <div>
                  <FieldLabel>Ngày tạo</FieldLabel>
                  <input
                    type="text"
                    value={today}
                    readOnly
                    className="w-full px-3 py-1.5 rounded border border-gray-200 text-sm bg-gray-50 text-gray-500 cursor-default"
                  />
                </div>

                {/* Title */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <FieldLabel>Danh xưng</FieldLabel>
                    <button type="button" className="text-orange-500 hover:text-orange-600">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <select
                    value={formData.title}
                    onChange={(e) => set('title', e.target.value)}
                    className={selectClass()}
                  >
                    <option value="">-- Chọn danh xưng --</option>
                    {TITLE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Customer code */}
                <div>
                  <FieldLabel>Mã khách hàng</FieldLabel>
                  <input
                    type="text"
                    value={customerRef ?? '(Tự động)'}
                    readOnly
                    className="w-full px-3 py-1.5 rounded border border-gray-200 text-sm bg-gray-50 text-gray-500 cursor-default"
                  />
                </div>

                {/* Email */}
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="email@example.com"
                    className={inputClass(!!getError('email'))}
                  />
                  {getError('email') && <p className="mt-0.5 text-xs text-red-500">{getError('email')}</p>}
                </div>

                {/* Country */}
                <div>
                  <FieldLabel>Quốc gia</FieldLabel>
                  <input
                    type="text"
                    defaultValue="Viet Nam"
                    className={inputClass(false)}
                  />
                </div>

                {/* Weight */}
                <div>
                  <FieldLabel>Cân nặng (Kg)</FieldLabel>
                  <input
                    type="number"
                    value={formData.weight ?? ''}
                    onChange={(e) => set('weight', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                    min={0}
                    className={inputClass(false)}
                  />
                </div>

                {/* Street */}
                <div>
                  <FieldLabel>Số nhà</FieldLabel>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => set('street', e.target.value)}
                    placeholder="123 Nguyễn Huệ"
                    className={inputClass(false)}
                  />
                </div>

                {/* Occupation */}
                <div>
                  <FieldLabel>Nghề nghiệp</FieldLabel>
                  <input
                    type="text"
                    value={formData.jobtitle}
                    onChange={(e) => set('jobtitle', e.target.value)}
                    placeholder="Nhân viên văn phòng"
                    className={inputClass(false)}
                  />
                </div>

                {/* Province/City */}
                <div>
                  <FieldLabel>Tỉnh/Thành</FieldLabel>
                  <select
                    value={formData.cityname}
                    onChange={(e) => {
                      set('cityname', e.target.value);
                      set('districtname', '');
                      set('wardname', '');
                    }}
                    className={selectClass()}
                  >
                    <option value="">-- Chọn Tỉnh/Thành --</option>
                    {VIET_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Health insurance */}
                <div>
                  <FieldLabel>Số thẻ bảo hiểm y tế</FieldLabel>
                  <input
                    type="text"
                    value={formData.healthinsurancecardnumber}
                    onChange={(e) => set('healthinsurancecardnumber', e.target.value)}
                    placeholder="DN4xxxxxxxx"
                    className={inputClass(false)}
                  />
                </div>

                {/* District */}
                <div>
                  <FieldLabel>Quận/Huyện</FieldLabel>
                  <select
                    value={formData.districtname}
                    onChange={(e) => {
                      set('districtname', e.target.value);
                      set('wardname', '');
                    }}
                    className={selectClass()}
                  >
                    <option value="">-- Chọn Quận/Huyện --</option>
                    {districtsForCity.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* ID / Passport */}
                <div>
                  <FieldLabel>Căn cước / Hộ chiếu</FieldLabel>
                  <input
                    type="text"
                    value={formData.identitynumber}
                    onChange={(e) => set('identitynumber', e.target.value)}
                    placeholder="0xxxxxxxxx"
                    className={inputClass(false)}
                  />
                </div>

                {/* Ward */}
                <div>
                  <FieldLabel>Phường/Xã</FieldLabel>
                  <select
                    value={formData.wardname}
                    onChange={(e) => set('wardname', e.target.value)}
                    className={selectClass()}
                  >
                    <option value="">-- Chọn Phường/Xã --</option>
                    {wardsForDistrict.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* ── Tab: Medical History ── */}
            {activeTab === 'medical' && (
              <div>
                <FieldLabel>Tiểu sử bệnh</FieldLabel>
                <textarea
                  value={formData.medicalhistory}
                  onChange={(e) => set('medicalhistory', e.target.value)}
                  placeholder="Nhập tiểu sử bệnh, dị ứng, thuốc đang dùng..."
                  rows={10}
                  className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400 resize-none"
                />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {['Tiểu đường', 'Tim mạch', 'Dị ứng thuốc', 'Huyết áp cao', 'Hen suyễn', 'Đang mang thai'].map((cond) => (
                    <label key={cond} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-orange-500"
                        onChange={(e) => {
                          if (e.target.checked) {
                            set('medicalhistory', formData.medicalhistory
                              ? `${formData.medicalhistory}\n${cond}`
                              : cond);
                          }
                        }}
                      />
                      {cond}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tab: E-Invoice ── */}
            {activeTab === 'einvoice' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isbusinessinvoice"
                    checked={formData.isbusinessinvoice}
                    onChange={(e) => set('isbusinessinvoice', e.target.checked)}
                    className="accent-orange-500 w-4 h-4"
                  />
                  <label htmlFor="isbusinessinvoice" className="text-sm text-gray-700 cursor-pointer">
                    Xuất hóa đơn doanh nghiệp
                  </label>
                </div>

                {formData.isbusinessinvoice && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="col-span-2">
                      <FieldLabel>Tên công ty</FieldLabel>
                      <input type="text" value={formData.unitname} onChange={(e) => set('unitname', e.target.value)}
                        placeholder="Công ty TNHH..." className={inputClass(false)} />
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>Địa chỉ công ty</FieldLabel>
                      <input type="text" value={formData.unitaddress} onChange={(e) => set('unitaddress', e.target.value)}
                        placeholder="123 Đường..." className={inputClass(false)} />
                    </div>
                    <div>
                      <FieldLabel>Mã số thuế</FieldLabel>
                      <input type="text" value={formData.taxcode} onChange={(e) => set('taxcode', e.target.value)}
                        placeholder="0123456789" className={inputClass(false)} />
                    </div>
                    <div>
                      <FieldLabel>Họ tên người nhận</FieldLabel>
                      <input type="text" value={formData.personalname} onChange={(e) => set('personalname', e.target.value)}
                        placeholder="Nguyễn Văn A" className={inputClass(false)} />
                    </div>
                    <div>
                      <FieldLabel>CCCD người nhận</FieldLabel>
                      <input type="text" value={formData.personalidentitycard} onChange={(e) => set('personalidentitycard', e.target.value)}
                        placeholder="0xxxxxxxxx" className={inputClass(false)} />
                    </div>
                    <div>
                      <FieldLabel>MST cá nhân</FieldLabel>
                      <input type="text" value={formData.personaltaxcode} onChange={(e) => set('personaltaxcode', e.target.value)}
                        placeholder="0xxxxxxxxx" className={inputClass(false)} />
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>Địa chỉ người nhận</FieldLabel>
                      <input type="text" value={formData.personaladdress} onChange={(e) => set('personaladdress', e.target.value)}
                        placeholder="123 Đường..." className={inputClass(false)} />
                    </div>
                  </div>
                )}

                {!formData.isbusinessinvoice && (
                  <p className="text-sm text-gray-400 italic">Bật tùy chọn trên để nhập thông tin hóa đơn doanh nghiệp.</p>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 flex-shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-orange-500 rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Lưu'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
