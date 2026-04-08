/**
 * EmployeeForm — Modal form for creating and editing employees
 * @crossref:used-in[Employees]
 * @crossref:uses[createEmployee, updateEmployee, fetchCompanies]
 */

import { useState, useEffect } from 'react';
import { X, Loader2, UserPlus, User, Phone, Mail, MapPin, CalendarDays, CheckCircle2, Shield, ChevronDown } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { createEmployee, updateEmployee, type CreateEmployeeData } from '@/lib/api';
import { fetchCompanies } from '@/lib/api';
import type { ApiCompany } from '@/lib/api';

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
  const [locations, setLocations] = useState<ApiCompany[]>([]);

  // Form state
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

  // Load locations
  useEffect(() => {
    fetchCompanies()
      .then((res) => setLocations(res.items))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!isdoctor && !isassistant && !isreceptionist) {
      setError('At least one role must be selected');
      return;
    }

    const data: CreateEmployeeData = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      companyid: companyid || undefined,
      isdoctor,
      isassistant,
      isreceptionist,
      active,
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
      setError(err instanceof Error ? err.message : 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  const isValid = name.trim() && (isdoctor || isassistant || isreceptionist);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header with gradient */}
        <div className="relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                {isEdit ? <User className="w-5 h-5 text-white" /> : <UserPlus className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {isEdit ? 'Edit Employee' : 'Add New Employee'}
                </h2>
                <p className="text-sm text-orange-100 mt-0.5">
                  {isEdit ? 'Update employee information' : 'Create a new team member'}
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
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter employee name"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
              required
            />
          </div>

          {/* Phone & Email Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" />
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              Location
            </label>
            <div className="relative">
              <select
                value={companyid}
                onChange={(e) => setCompanyid(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm appearance-none cursor-pointer"
              >
                <option value="">Select location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Roles */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              Roles <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <RoleButton
                selected={isdoctor}
                onClick={() => setIsdoctor(!isdoctor)}
                label="Dentist"
                color="orange"
              />
              <RoleButton
                selected={isassistant}
                onClick={() => setIsassistant(!isassistant)}
                label="Assistant"
                color="green"
              />
              <RoleButton
                selected={isreceptionist}
                onClick={() => setIsreceptionist(!isreceptionist)}
                label="Receptionist"
                color="blue"
              />
            </div>
            {!isdoctor && !isassistant && !isreceptionist && (
              <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-amber-500" />
                At least one role must be selected
              </p>
            )}
          </div>

          {/* Start Date & Status Row */}
          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              value={startworkdate}
              onChange={setStartworkdate}
              label="Start Date"
              icon={<CalendarDays className="w-3.5 h-3.5" />}
            />
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Status
              </label>
              <button
                type="button"
                onClick={() => setActive(!active)}
                className={`
                  w-full flex items-center gap-2 px-4 py-3 rounded-xl border transition-all duration-200
                  ${active 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                  }
                `}
              >
                <div className={`
                  w-2 h-2 rounded-full transition-colors
                  ${active ? 'bg-emerald-500' : 'bg-gray-400'}
                `} />
                <span className="text-sm font-medium">{active ? 'Active' : 'Inactive'}</span>
              </button>
            </div>
          </div>

          {/* Footer - inside form */}
          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isValid}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
    <button
      type="button"
      onClick={onClick}
      className={`
        px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200
        ${selected ? colors[color].active : colors[color].inactive}
      `}
    >
      {label}
    </button>
  );
}
