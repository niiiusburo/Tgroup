import { useState, useCallback, useEffect } from 'react';
import { X, Camera, Plus, Users, UserPlus, Globe, MapPin, Briefcase, Building2, Stethoscope } from 'lucide-react';
import { fetchCompanies, fetchEmployees } from '@/lib/api';
import type { ApiCompany, ApiEmployee } from '@/lib/api';
import {
  EMPTY_CUSTOMER_FORM,
  validateCustomerForm,
  VIET_CITIES,
  VIET_DISTRICTS,
  VIET_WARDS,
  TITLE_OPTIONS,
} from '@/data/mockCustomerForm';
import type { CustomerFormData, FormValidationError } from '@/data/mockCustomerForm';
import { useCustomerSources } from '@/hooks/useSettings';
import type { CustomerSource } from '@/data/mockSettings';
import { AddressAutocomplete } from '@/components/shared/AddressAutocomplete';

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                         CUSTOMER FORM MODULE                                  ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  This component handles BOTH Add and Edit modes via the `isEdit` prop.       ║
 * ║                                                                              ║
 * ║  MODULAR STRUCTURE (Left Panel):                                             ║
 * ║  ┌─────────────────────────────────────┐                                    ║
 * ║  │ Header (flex-shrink-0)               │ ← Does NOT scroll                   ║
 * ║  ├─────────────────────────────────────┤                                    ║
 * ║  │ Content (overflow-y-auto)            │ ← Scrolls INDEPENDENTLY              ║
 * ║  │  ┌─────────────────────────────┐     │                                    ║
 * ║  │  │ Card 1: Personal Info       │     │  max-height: 300px                  ║
 * ║  │  │ (Avatar, Name, Gender,      │     │                                    ║
 * ║  │  │  Phone + Emergency)         │     │                                    ║
 * ║  │  └─────────────────────────────┘     │                                    ║
 * ║  │  ┌─────────────────────────────┐     │                                    ║
 * ║  │  │ Card 2: Assignment         │     │  max-height: 320px                  ║
 * ║  │  │ (Branch, Sales, CSKH,       │     │                                    ║
 * ║  │  │  Source, Referral)          │     │                                    ║
 * ║  │  └─────────────────────────────┘     │                                    ║
 * ║  │  ┌─────────────────────────────┐     │                                    ║
 * ║  │  │ Card 3: Notes               │     │  max-height: 180px                  ║
 * ║  │  └─────────────────────────────┘     │                                    ║
 * ║  └─────────────────────────────────────┘                                    ║
 * ║                                                                              ║
 * ║  RIGHT PANEL (Tabs):                                                        ║
 * ║  ┌─────────────────────────────────────┐                                    ║
 * ║  │ Tab Headers (flex-shrink-0)         │ ← Does NOT scroll                   ║
 * ║  ├─────────────────────────────────────┤                                    ║
 * ║  │ Tab Content (overflow-y-auto)       │ ← Scrolls independently            ║
 * ║  │  - Basic Info (2-col grid)          │                                    ║
 * ║  │  - Medical History                  │                                    ║
 * ║  │  - E-Invoice                        │                                    ║
 * ║  └─────────────────────────────────────┘                                    ║
 * ║                                                                              ║
 * ║  ⚠️  IMPORTANT: If you modify the left panel structure, ensure:             ║
 * ║      1. CardSection component props are consistent                           ║
 * ║      2. maxHeight values are appropriate for content                        ║
 * ║      3. flex-shrink-0 on headers / overflow-y-auto on content                 ║
 * ║      4. The CardSection component is the single source of truth             ║
 * ║                                                                              ║
 * ║  Reference: ~/Downloads/CardScrollRedesign/app/src/App.tsx                   ║
 * ║  @crossref:used-in[Customers]                                                ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * AddCustomerForm - TDental "Thêm khách hàng" modular card-based form
 * Redesigned to match Overview page card design with functional + buttons
 * Supports both create and edit modes.
 * @crossref:used-in[Customers]
 *
 * ⚠️ LAYOUT LOCK: Do NOT change the modal width (900px) or the left panel width (320px).
 *    - Modal max-width: 900px (set via inline style in Customers.tsx)
 *    - Left panel width: 320px (w-80 class)
 *    - Right panel: flex-1 (takes remaining space)
 *    - Form height: 85vh with max 800px
 *    Any changes to these dimensions require explicit user approval.
 */

interface AddCustomerFormProps {
  readonly initialData?: Partial<CustomerFormData>;
  readonly customerRef?: string | null;
  readonly onSubmit: (data: CustomerFormData) => void;
  readonly onCancel: () => void;
  readonly isEdit?: boolean;
  readonly canEdit?: boolean; // If true, allows editing all fields even in edit mode
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

// Type icons for sources
const TYPE_ICONS: Record<CustomerSource['type'], React.ReactNode> = {
  online: <Globe className="w-3.5 h-3.5" />,
  offline: <MapPin className="w-3.5 h-3.5" />,
  referral: <UserPlus className="w-3.5 h-3.5" />,
};

const TYPE_COLORS: Record<CustomerSource['type'], string> = {
  online: 'bg-blue-50 text-blue-700 border-blue-200',
  offline: 'bg-amber-50 text-amber-700 border-amber-200',
  referral: 'bg-green-50 text-green-700 border-green-200',
};

function inputClass(hasError: boolean, disabled = false) {
  return [
    'w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2',
    hasError
      ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
      : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400',
    disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white hover:border-gray-300',
  ].join(' ');
}

function selectClass(disabled = false) {
  return [
    'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white',
    'focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all',
    disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'hover:border-gray-300',
  ].join(' ');
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-gray-600 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

/**
 * CardSection - Reusable card component with INDEPENDENT scrolling
 * 
 * IMPORTANT: This component enforces a fixed height container where:
 * - The header stays visible (flex-shrink-0)
 * - Only the content area scrolls (overflow-y-auto)
 * 
 * Usage: Always use maxHeight prop to enable independent scrolling.
 * Without maxHeight, the card will expand to fit content.
 * 
 * @see CustomerFormModule note above for the complete modular structure
 */
function CardSection({ 
  title, 
  icon: Icon, 
  children, 
  action,
  className = '',
  maxHeight = 'none'
}: { 
  title: string; 
  icon?: React.ElementType; 
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  maxHeight?: string;
}) {
  return (
    <div 
      className={`bg-white rounded-2xl border border-gray-200 flex flex-col ${className}`}
      style={{ maxHeight, height: maxHeight !== 'none' ? maxHeight : 'auto' }}
    >
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-gray-500" />}
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
        {children}
      </div>
    </div>
  );
}

// Mini Dialog for adding sources/referrers - Matching EditAppointmentModal luxury style
function MiniAddDialog({
  isOpen,
  onClose,
  title,
  onSubmit,
  placeholder,

}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSubmit: (value: string) => void;
  placeholder: string;

}) {
  const [value, setValue] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      setValue('');
      onClose();
    }
  };

  return (
    <div className="modal-container">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with gradient */}
        <div className="modal-header relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        
        <div className="px-6 py-6">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {placeholder}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        
        <div className="modal-footer px-6 py-5 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
          >
            Thêm
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddCustomerForm({
  initialData,
  customerRef,
  onSubmit,
  onCancel,
  isEdit = false,
  canEdit = false,
}: AddCustomerFormProps) {
  // Fields should be editable if not in edit mode OR if user has edit permission
  const isFieldEditable = !isEdit || canEdit;
  const [formData, setFormData] = useState<CustomerFormData>({
    ...EMPTY_CUSTOMER_FORM,
    ...(initialData ?? {}),
  });
  const [errors, setErrors] = useState<readonly FormValidationError[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameUppercase, setNameUppercase] = useState(false);

  // Dialog states
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [showReferrerDialog, setShowReferrerDialog] = useState(false);
  const [showSalesDialog, setShowSalesDialog] = useState(false);

  // Dropdown data
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  
  // Customer sources from settings hook
  const { allSources, addSource } = useCustomerSources();

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

  // Handle adding new source
  const handleAddSource = (name: string) => {
    addSource({
      name,
      type: 'offline',
      description: 'Custom source',
      isActive: true,
    });
    // Auto-select the new source (in a real app, we'd get the ID back)
    // For now, we'll just close the dialog
  };

  // Handle adding new referrer (employee)
  const handleAddReferrer = (name: string) => {
    // In a real app, this would call an API to create a new employee
    // For now, we just show a placeholder notification
    alert(`Đã thêm ngưới giới thiệu: ${name} (Cần tích hợp API tạo nhân viên)`);
  };

  // Handle adding new sales staff
  const handleAddSalesStaff = (name: string) => {
    alert(`Đã thêm nhân viên sale: ${name} (Cần tích hợp API tạo nhân viên)`);
  };

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

  // Helper function to find best match between Google Places result and Vietnamese address data
  const findBestMatch = (input: string, options: readonly string[]): string | null => {
    if (!input || options.length === 0) return null;
    
    const normalizedInput = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Try exact match first
    const exactMatch = options.find(opt => 
      opt.toLowerCase() === input.toLowerCase()
    );
    if (exactMatch) return exactMatch;
    
    // Try normalized match (remove diacritics)
    const normalizedMatch = options.find(opt => {
      const normalizedOpt = opt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalizedOpt === normalizedInput;
    });
    if (normalizedMatch) return normalizedMatch;
    
    // Try partial match
    const partialMatch = options.find(opt => {
      const normalizedOpt = opt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalizedOpt.includes(normalizedInput) || normalizedInput.includes(normalizedOpt);
    });
    if (partialMatch) return partialMatch;
    
    // Try word-by-word matching
    const inputWords = normalizedInput.split(/\s+/);
    let bestMatch: string | null = null;
    let bestScore = 0;
    
    for (const option of options) {
      const normalizedOpt = option.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const optWords = normalizedOpt.split(/\s+/);
      
      let score = 0;
      for (const word of inputWords) {
        if (word.length > 2 && optWords.some(optWord => optWord.includes(word))) {
          score += 1;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = option;
      }
    }
    
    return bestScore > 0 ? bestMatch : null;
  };

  const districtsForCity = VIET_DISTRICTS[formData.cityname] ?? [];
  const wardsForDistrict = VIET_WARDS[formData.districtname] ?? [];

  const today = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Get selected source details
  const selectedSource = allSources.find(s => s.id === formData.sourceid);

  return (
    <div 
      className="flex flex-col bg-gray-50/50" 
      style={{ height: '85vh', maxHeight: '800px' }}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Mini Dialogs (use their own modal-container) */}
      <MiniAddDialog
        isOpen={showSourceDialog}
        onClose={() => setShowSourceDialog(false)}
        title="Thêm nguồn khách hàng mới"
        placeholder="Nhập tên nguồn (vd: TikTok, Youtube...)"
        onSubmit={handleAddSource}
      />
      <MiniAddDialog
        isOpen={showReferrerDialog}
        onClose={() => setShowReferrerDialog(false)}
        title="Thêm ngưới giới thiệu mới"
        placeholder="Nhập tên ngưới giới thiệu"
        onSubmit={handleAddReferrer}
      />
      <MiniAddDialog
        isOpen={showSalesDialog}
        onClose={() => setShowSalesDialog(false)}
        title="Thêm nhân viên sale mới"
        placeholder="Nhập tên nhân viên sale"
        onSubmit={handleAddSalesStaff}
      />

      {/* Header - Luxurious Style */}
      <div className="relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 flex-shrink-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {isEdit ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 overflow-hidden">
        {/* ── Left Panel ─────────────────────────────────────── */}
        {/* Fixed width, flex column, each card has independent scroll */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col gap-4 px-5 py-5 overflow-hidden bg-gray-50/30">
          {/* Profile Card - Fixed height with independent scroll */}
          <CardSection title="Thông tin cá nhân" icon={Users} maxHeight="300px">
            {/* Avatar */}
            <div className="flex justify-center mb-4">
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:from-gray-200 hover:to-gray-300 transition-all group">
                {formData.photoUrl ? (
                  <img src={formData.photoUrl} alt="avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-gray-400 group-hover:text-gray-500" />
                )}
                <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/5 transition-colors" />
              </div>
            </div>

            {/* Name */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <FieldLabel required>Họ và tên</FieldLabel>
                <button
                  type="button"
                  onClick={() => setNameUppercase((v) => !v)}
                  className={`text-[10px] px-2 py-1 rounded-md border font-medium transition-colors ${
                    nameUppercase
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
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
                disabled={!isFieldEditable}
                className={inputClass(!!getError('name'), !isFieldEditable)}
                style={nameUppercase ? { textTransform: 'uppercase' } : {}}
              />
              {getError('name') && <p className="mt-1 text-xs text-red-500">{getError('name')}</p>}
            </div>

            {/* Gender */}
            <div className="mb-3">
              <FieldLabel>Giới tính</FieldLabel>
              <div className="flex gap-4">
                {(['male', 'female', 'other'] as const).map((g) => (
                  <label key={g} className={`flex items-center gap-2 text-sm ${!isFieldEditable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={formData.gender === g}
                      onChange={() => isFieldEditable && set('gender', g)}
                      disabled={!isFieldEditable}
                      className="accent-orange-500 w-4 h-4"
                    />
                    <span className="text-gray-700">{g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : 'Khác'}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Phone */}
            <div className="mb-3">
              <FieldLabel required>Số điện thoại</FieldLabel>
              <div className="flex gap-2">
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
                  className="px-3 py-2 border border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {getError('phone') && <p className="mt-1 text-xs text-red-500">{getError('phone')}</p>}
            </div>
          </CardSection>

          {/* Assignment Card - Fixed height with independent scroll */}
          <CardSection 
            title="Phân công" 
            icon={Briefcase}
            action={
              <span className="text-xs text-gray-400">{employees.length} nhân viên</span>
            }
            maxHeight="320px"
          >
            {/* Branch */}
            <div className="mb-3">
              <FieldLabel required>Chi nhánh</FieldLabel>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={formData.companyid}
                  onChange={(e) => set('companyid', e.target.value)}
                  className={selectClass() + ' pl-9'}
                >
                  <option value="">-- Chọn chi nhánh --</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {getError('companyid') && <p className="mt-1 text-xs text-red-500">{getError('companyid')}</p>}
            </div>

            {/* Sales staff */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <FieldLabel>Nhân viên sale</FieldLabel>
                <button
                  type="button"
                  onClick={() => setShowSalesDialog(true)}
                  className="p-1 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                  title="Thêm nhân viên sale mới"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
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

            {/* CSKH (Customer Service) - NEW */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <FieldLabel>CSKH (Chăm sóc khách hàng)</FieldLabel>
                <button
                  type="button"
                  onClick={() => alert('Tính năng thêm CSKH mới sẽ được phát triển sau')}
                  className="p-1 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                  title="Thêm CSKH mới"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <select
                value={formData.cskhid}
                onChange={(e) => set('cskhid', e.target.value)}
                className={selectClass()}
              >
                <option value="">-- Chọn CSKH --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            {/* Source */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <FieldLabel>Nguồn</FieldLabel>
                <button 
                  type="button" 
                  onClick={() => setShowSourceDialog(true)}
                  className="p-1 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                  title="Thêm nguồn mới"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <select
                value={formData.sourceid}
                onChange={(e) => set('sourceid', e.target.value)}
                className={selectClass()}
              >
                <option value="">-- Chọn nguồn --</option>
                {allSources.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {selectedSource && (
                <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border ${TYPE_COLORS[selectedSource.type]}`}>
                  {TYPE_ICONS[selectedSource.type]}
                  <span>{selectedSource.type === 'online' ? 'Online' : selectedSource.type === 'offline' ? 'Offline' : 'Giới thiệu'}</span>
                </div>
              )}
            </div>

            {/* Referral */}
            <div className="mb-1">
              <div className="flex items-center justify-between mb-1.5">
                <FieldLabel>Ngưới giới thiệu</FieldLabel>
                <button 
                  type="button" 
                  onClick={() => setShowReferrerDialog(true)}
                  className="p-1 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                  title="Thêm ngưới giới thiệu mới"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <select
                value={formData.referraluserid}
                onChange={(e) => set('referraluserid', e.target.value)}
                className={selectClass()}
              >
                <option value="">-- Chọn ngưới giới thiệu --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          </CardSection>

          {/* Notes Card - Fixed height with independent scroll */}
          <CardSection title="Ghi chú" icon={Stethoscope} maxHeight="180px">
            <textarea
              value={formData.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="Ghi chú về khách hàng..."
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 resize-none transition-all hover:border-gray-300"
            />
          </CardSection>
        </div>

        {/* ── Right Panel ────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 flex-shrink-0 px-6 bg-gray-50/30">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-all -mb-px ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-8 py-6">
            {/* ── Tab: Basic Info ── */}
            {activeTab === 'basic' && (
              <div className="max-w-4xl">
                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  {/* DOB */}
                  <div>
                    <FieldLabel>Ngày sinh</FieldLabel>
                    <div className="flex gap-2">
                      <select
                        value={formData.birthday ?? ''}
                        onChange={(e) => set('birthday', e.target.value ? Number(e.target.value) : null)}
                        disabled={!isFieldEditable}
                        className={`flex-1 ${selectClass(!isFieldEditable)}`}
                      >
                        <option value="">Ngày</option>
                        {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select
                        value={formData.birthmonth ?? ''}
                        onChange={(e) => set('birthmonth', e.target.value ? Number(e.target.value) : null)}
                        disabled={!isFieldEditable}
                        className={`flex-1 ${selectClass(!isFieldEditable)}`}
                      >
                        <option value="">Tháng</option>
                        {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select
                        value={formData.birthyear ?? ''}
                        onChange={(e) => set('birthyear', e.target.value ? Number(e.target.value) : null)}
                        disabled={!isFieldEditable}
                        className={`flex-1 ${selectClass(!isFieldEditable)}`}
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
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-500 cursor-default"
                    />
                  </div>

                  {/* Title */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <FieldLabel>Danh xưng</FieldLabel>
                      <button 
                        type="button" 
                        onClick={() => alert('Tính năng thêm danh xưng tuỳ chỉnh sẽ được phát triển sau')}
                        className="p-1 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                      >
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
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-500 cursor-default"
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
                    {getError('email') && <p className="mt-1 text-xs text-red-500">{getError('email')}</p>}
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

                  {/* Street - Google Places Autocomplete */}
                  <div>
                    <FieldLabel>Số nhà / Địa chỉ</FieldLabel>
                    <AddressAutocomplete
                      value={formData.street}
                      onChange={(address, details) => {
                        set('street', address);
                        // Auto-fill city, district, ward if details available
                        if (details) {
                          // Try to match city
                          const matchedCity = findBestMatch(details.city, VIET_CITIES);
                          if (matchedCity) {
                            set('cityname', matchedCity);
                            // Get districts for this city
                            const districts = VIET_DISTRICTS[matchedCity] || [];
                            // Try to match district
                            const matchedDistrict = findBestMatch(details.district, districts);
                            if (matchedDistrict) {
                              set('districtname', matchedDistrict);
                              // Get wards for this district
                              const wards = VIET_WARDS[matchedDistrict] || [];
                              // Try to match ward
                              const matchedWard = findBestMatch(details.ward, wards);
                              if (matchedWard) {
                                set('wardname', matchedWard);
                              }
                            }
                          }
                        }
                      }}
                      placeholder="Nhập địa chỉ (ví dụ: 123 Nguyễn Huệ...)"
                    />
                    <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-orange-500" />
                      Gõ địa chỉ để tự động điền Tỉnh/Thành, Quận/Huyện, Phường/Xã
                    </p>
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
              </div>
            )}

            {/* ── Tab: Medical History ── */}
            {activeTab === 'medical' && (
              <div className="max-w-3xl">
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-4">
                  <h4 className="text-sm font-medium text-orange-800 mb-1">Lưu ý y tế</h4>
                  <p className="text-xs text-orange-600">Thông tin tiểu sử bệnh giúp bác sĩ đánh giá tốt hơn tình trạng sức khỏe của bệnh nhân.</p>
                </div>
                <FieldLabel>Tiểu sử bệnh</FieldLabel>
                <textarea
                  value={formData.medicalhistory}
                  onChange={(e) => set('medicalhistory', e.target.value)}
                  placeholder="Nhập tiểu sử bệnh, dị ứng, thuốc đang dùng..."
                  rows={8}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 resize-none transition-all hover:border-gray-300"
                />
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {['Tiểu đường', 'Tim mạch', 'Dị ứng thuốc', 'Huyết áp cao', 'Hen suyễn', 'Đang mang thai'].map((cond) => (
                    <label key={cond} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        className="accent-orange-500 w-4 h-4 rounded"
                        onChange={(e) => {
                          if (e.target.checked) {
                            set('medicalhistory', formData.medicalhistory
                              ? `${formData.medicalhistory}\n${cond}`
                              : cond);
                          }
                        }}
                      />
                      <span>{cond}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tab: E-Invoice ── */}
            {activeTab === 'einvoice' && (
              <div className="max-w-4xl">
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl mb-5">
                  <input
                    type="checkbox"
                    id="isbusinessinvoice"
                    checked={formData.isbusinessinvoice}
                    onChange={(e) => set('isbusinessinvoice', e.target.checked)}
                    className="accent-orange-500 w-5 h-5 rounded"
                  />
                  <label htmlFor="isbusinessinvoice" className="text-sm font-medium text-gray-800 cursor-pointer flex-1">
                    Xuất hóa đơn doanh nghiệp
                  </label>
                </div>

                {formData.isbusinessinvoice && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="col-span-2">
                      <FieldLabel>Tên công ty</FieldLabel>
                      <input 
                        type="text" 
                        value={formData.unitname} 
                        onChange={(e) => set('unitname', e.target.value)}
                        placeholder="Công ty TNHH..." 
                        className={inputClass(false)} 
                      />
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>Địa chỉ công ty</FieldLabel>
                      <input 
                        type="text" 
                        value={formData.unitaddress} 
                        onChange={(e) => set('unitaddress', e.target.value)}
                        placeholder="123 Đường..." 
                        className={inputClass(false)} 
                      />
                    </div>
                    <div>
                      <FieldLabel>Mã số thuế</FieldLabel>
                      <input 
                        type="text" 
                        value={formData.taxcode} 
                        onChange={(e) => set('taxcode', e.target.value)}
                        placeholder="0123456789" 
                        className={inputClass(false)} 
                      />
                    </div>
                    <div>
                      <FieldLabel>Họ tên ngưới nhận</FieldLabel>
                      <input 
                        type="text" 
                        value={formData.personalname} 
                        onChange={(e) => set('personalname', e.target.value)}
                        placeholder="Nguyễn Văn A" 
                        className={inputClass(false)} 
                      />
                    </div>
                    <div>
                      <FieldLabel>CCCD ngưới nhận</FieldLabel>
                      <input 
                        type="text" 
                        value={formData.personalidentitycard} 
                        onChange={(e) => set('personalidentitycard', e.target.value)}
                        placeholder="0xxxxxxxxx" 
                        className={inputClass(false)} 
                      />
                    </div>
                    <div>
                      <FieldLabel>MST cá nhân</FieldLabel>
                      <input 
                        type="text" 
                        value={formData.personaltaxcode} 
                        onChange={(e) => set('personaltaxcode', e.target.value)}
                        placeholder="0xxxxxxxxx" 
                        className={inputClass(false)} 
                      />
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>Địa chỉ ngưới nhận</FieldLabel>
                      <input 
                        type="text" 
                        value={formData.personaladdress} 
                        onChange={(e) => set('personaladdress', e.target.value)}
                        placeholder="123 Đường..." 
                        className={inputClass(false)} 
                      />
                    </div>
                  </div>
                )}

                {!formData.isbusinessinvoice && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Building2 className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">Bật tùy chọn trên để nhập thông tin hóa đơn doanh nghiệp.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-gray-100 flex-shrink-0 bg-gradient-to-b from-gray-50 to-white">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
            >
              {isSubmitting ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Lưu'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
