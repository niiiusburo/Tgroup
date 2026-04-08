/**
 * EmployeeForm — Modal form for creating and editing employees
 * @crossref:used-in[Employees]
 * @crossref:uses[createEmployee, updateEmployee, fetchCompanies]
 * @crossref:matches[AppointmentForm DESIGN STANDARD]
 *
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║  FORM FAMILY — @crossref:related[]                                     ║
 * ╠════════════════════════════════════════════════════════════════════════╣
 * ║  @crossref:related[AppointmentForm] — SISTER FORM                      ║
 * ║    • Header/footer/label/input styling MUST match                      ║
 * ║    • Should use shared LocationSelector (not native <select>)          ║
 * ║                                                                        ║
 * ║  @crossref:related[ServiceForm] — SISTER FORM                          ║
 * ║    • Same design standard                                              ║
 * ║                                                                        ║
 * ║  @crossref:related[PaymentForm] — SISTER FORM                          ║
 * ║    • Same design standard                                              ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect } from 'react';
import { X, Loader2, UserPlus, User, Phone, Mail, MapPin, CalendarDays, CheckCircle2, Shield, Check } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { LocationSelector } from '@/components/shared/LocationSelector';
import { createEmployee, updateEmployee, type CreateEmployeeData } from '@/lib/api';
import { fetchCompanies } from '@/lib/api';

interface EmployeeFormProps {
  readonly employee?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    companyid?: string;
    isdoctor: boolean;
    isassistant: boolean;
    isreceptionist: boolean;
    active: boolean;
    wage?: string | null;
    allowance?: string | null;
    startworkdate?: string | null;
  };
  readonly onClose: () => void;
  readonly onSave: () => void;
}

export function EmployeeForm({ employee, onClose, onSave }: EmployeeFormProps) {
  const isEdit = !!employee;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<{ id: string; name: string; address: string; phone: string; status: 'active' | 'inactive'; doctorCount: number; patientCount: number; appointmentCount: number }[]>([]);

  const [name, setName] = useState(employee?.name ?? '');
  const [phone, setPhone] = useState(employee?.phone ?? '');
  const [email, setEmail] = useState(employee?.email ?? '');
  const [companyid, setCompanyid] = useState(employee?.companyid ?? '');
  const [isdoctor, setIsdoctor] = useState(employee?.isdoctor ?? false);
  const [isassistant, setIsassistant] = useState(employee?.isassistant ?? false);
  const [isreceptionist, setIsreceptionist] = useState(employee?.isreceptionist ?? false);
  const [active, setActive] = useState(employee?.active ?? true);
  const [startworkdate, setStartworkdate] = useState(
    employee?.startworkdate ? employee.startworkdate.split('T')[0] : ''
  );

  useEffect(() => {
    fetchCompanies().then((res) => setLocations(res.items.map(l => ({
      id: l.id, name: l.name, address: '', phone: l.phone || '',
      status: (l.active ? 'active' : 'inactive') as 'active' | 'inactive', doctorCount: 0, patientCount: 0, appointmentCount: 0,
    })))).catch((err) => console.error('Failed to fetch locations:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Vui lòng nhập tên nhân viên');
      return;
    }
    if (!isdoctor && !isassistant && !isreceptionist) {
      setError('Vui lòng chọn ít nhất một vai trò');
      return;
    }

    const data: CreateEmployeeData = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      companyid: companyid || undefined,
      isdoctor, isassistant, isreceptionist, active,
      startworkdate: startworkdate || undefined,
    };

    setLoading(true);
    try {
      if (isEdit && employee) {
        await updateEmployee(employee.id, data);
      } else {
        await createEmployee(data);
      }
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const isValid = name.trim() && (isdoctor || isassistant || isreceptionist);

  return (
    <div className="modal-container">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-content animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="modal-header relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                {isEdit ? <User className="w-5 h-5 text-white" /> : <UserPlus className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{isEdit ? 'Sửa nhân viên' : 'Thêm nhân viên'}</h2>
                <p className="text-sm text-orange-100 mt-0.5">
                  {isEdit ? 'Cập nhật thông tin nhân viên' : 'Tạo nhân viên mới'}
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
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          {/* Họ và tên */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Nhập họ và tên"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
              required
            />
          </div>

          {/* Điện thoại + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" />
                Điện thoại
              </label>
              <input
                type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                Email
              </label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập email"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
              />
            </div>
          </div>

          {/* Chi nhánh */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              Chi nhánh
            </label>
            <LocationSelector
              locations={locations}
              selectedId={companyid || null}
              onChange={setCompanyid}
              excludeAll
            />
          </div>

          {/* Vai trò */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              Vai trò <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <RoleButton selected={isdoctor} onClick={() => setIsdoctor(!isdoctor)} label="Bác sĩ" color="orange" />
              <RoleButton selected={isassistant} onClick={() => setIsassistant(!isassistant)} label="Trợ lý" color="green" />
              <RoleButton selected={isreceptionist} onClick={() => setIsreceptionist(!isreceptionist)} label="Lễ tân" color="blue" />
            </div>
            {!isdoctor && !isassistant && !isreceptionist && (
              <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-amber-500" />
                Vui lòng chọn ít nhất một vai trò
              </p>
            )}
          </div>

          {/* Ngày bắt đầu + Trạng thái */}
          <div className="grid grid-cols-2 gap-4">
            <DatePicker value={startworkdate} onChange={setStartworkdate} label="Ngày bắt đầu" icon={<CalendarDays className="w-3.5 h-3.5" />} />
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Trạng thái
              </label>
              <button
                type="button" onClick={() => setActive(!active)}
                className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl border transition-all duration-200 ${
                  active ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <div className={`w-2 h-2 rounded-full transition-colors ${active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                <span className="text-sm font-medium">{active ? 'Đang làm việc' : 'Nghỉ việc'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="modal-footer px-6 py-5 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50">
            Hủy bỏ
          </button>
          <button type="submit" disabled={loading || !isValid}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? 'Cập nhật' : 'Thêm nhân viên'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Role Button Sub-component ──────────────────────────────────

interface RoleButtonProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  color: 'orange' | 'green' | 'blue';
}

function RoleButton({ selected, onClick, label, color }: RoleButtonProps) {
  const colors = {
    orange: {
      active: 'bg-orange-50 text-orange-700 border-orange-200 ring-2 ring-orange-500/20',
      inactive: 'bg-white border-gray-200 text-gray-600 hover:border-orange-300',
    },
    green: {
      active: 'bg-green-50 text-green-700 border-green-200 ring-2 ring-green-500/20',
      inactive: 'bg-white border-gray-200 text-gray-600 hover:border-green-300',
    },
    blue: {
      active: 'bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-blue-500/20',
      inactive: 'bg-white border-gray-200 text-gray-600 hover:border-blue-300',
    },
  };

  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${selected ? colors[color].active : colors[color].inactive}`}>
      {label}
    </button>
  );
}
