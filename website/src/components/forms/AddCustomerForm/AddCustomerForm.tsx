import {
  X,
  Plus,
  Users,
  Globe,
  MapPin,
  Briefcase,
  Building2,
  Stethoscope,
  CalendarPlus,
  Edit2,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  FileText,
  Info,
  Scale,
  ShieldCheck,
  CreditCard,
  Link,
  ScanFace,
} from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchCompanies, fetchEmployees, fetchPartners, fetchPartnerById, ApiError } from '@/lib/api';
import { normalizeText } from '@/lib/utils';
import type { ApiCompany, ApiEmployee, ApiPartner } from '@/lib/api';
import { useUniqueFieldCheck } from '@/hooks/useUniqueFieldCheck';
import { ComboboxInput } from '@/components/shared/ComboboxInput';
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
import { AddressAutocomplete } from '@/components/shared/AddressAutocomplete';
import { CustomerCameraWidget } from '@/components/customer/CustomerCameraWidget';
import { FaceCaptureModal } from '@/components/shared/FaceCaptureModal';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { inputClass, selectClass } from './styles';
import { TABS, DAYS, MONTHS, YEARS, TYPE_ICONS, TYPE_COLORS } from './constants';
import type { TabId } from './constants';
import { FieldLabel } from './FieldLabel';
import { CardSection } from './CardSection';
import { MiniAddDialog } from './MiniAddDialog';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════╗
 * ║                    ⛔  D O   N O T   T O U C H   T H I S   M O D U L E  ⛔          ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════╣
 * ║  This AddCustomerForm is the canonical GOLD STANDARD for all TG Clinic modal forms. ║
 * ║  ANY new form or modal MUST copy this exact visual standard:                        ║
 * ║                                                                                     ║
 * ║  • Header        : orange gradient + icon + title + subtitle                        ║
 * ║  • Labels        : uppercase, semibold, gray-500, tracking-wider, small icon        ║
 * ║  • Inputs        : px-4 py-3, rounded-xl, border-gray-200, focus:ring-orange-500/20 ║
 * ║  • Selects       : same as inputs + custom chevron, appearance-none                 ║
 * ║  • Cards         : rounded-2xl, border-gray-200, overflow-hidden                    ║
 * ║  • Footer        : border-t border-gray-200, gradient bg, rounded-xl buttons        ║
 * ║                                                                                     ║
 * ║  This component is the single source of truth for TG Clinic form styling.            ║
 * ║  Every new modal/form MUST visually match this exact standard.                      ║
 * ║  BEFORE modifying this file, you MUST run Playwright visual regression.             ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * AddCustomerForm - TG Clinic "Thêm khách hàng" modular card-based form
 * Supports both create and edit modes.
 * @crossref:used-in[Customers]
 */

interface AddCustomerFormProps {
  readonly initialData?: Partial<CustomerFormData>;
  readonly customerRef?: string | null;
  readonly customerId?: string;
  readonly onSubmit: (data: CustomerFormData) => void | Promise<void>;
  readonly onCancel: () => void;
  readonly onPendingFaceImage?: (image: Blob | null) => void;
  readonly isEdit?: boolean;
  readonly canEdit?: boolean;
}


export function AddCustomerForm({
  initialData,
  customerRef,
  customerId,
  onSubmit,
  onCancel,
  onPendingFaceImage,
  isEdit = false,
  canEdit = false,
}: AddCustomerFormProps) {
  const { t } = useTranslation('customers');
  const isFieldEditable = !isEdit || canEdit;
  const [formData, setFormData] = useState<CustomerFormData>({
    ...EMPTY_CUSTOMER_FORM,
    ...(initialData ?? {}),
  });
  const [errors, setErrors] = useState<readonly FormValidationError[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameUppercase, setNameUppercase] = useState(false);
  const [displayRef, setDisplayRef] = useState<string | null>(customerRef ?? null);

  const [showSourceDialog, setShowSourceDialog] = useState(false);

  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);

  const [pendingFaceImage, setPendingFaceImage] = useState<Blob | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const { registerState, register, reset: resetFace } = useFaceRecognition();

  useEffect(() => {
    onPendingFaceImage?.(pendingFaceImage);
  }, [pendingFaceImage, onPendingFaceImage]);

  const { allSources, addSource } = useCustomerSources();

  useEffect(() => {
    fetchCompanies({ limit: 50 }).then((r) => setCompanies(r.items)).catch(() => {});
    fetchEmployees({ limit: 100 }).then((r) => setEmployees(r.items)).catch(() => {});
  }, []);

  useEffect(() => {
    setFormData({ ...EMPTY_CUSTOMER_FORM, ...(initialData ?? {}) });
  }, [initialData]);

  useEffect(() => {
    setDisplayRef(customerRef ?? null);
    if (customerRef && isEdit) {
      setFormData(prev => ({ ...prev, ref: customerRef }));
    }
  }, [customerRef, isEdit]);

  // ─── Async customer search for referrer ────────────────────────────────
  const [referrerQuery, setReferrerQuery] = useState('');
  const [referrerResults, setReferrerResults] = useState<ApiPartner[]>([]);
  const [referrerLoading, setReferrerLoading] = useState(false);
  const [referrerOpen, setReferrerOpen] = useState(false);
  const [selectedReferrer, setSelectedReferrer] = useState<ApiPartner | null>(null);
  const referrerTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const referrerContainerRef = useRef<HTMLDivElement>(null);

  // Load selected referrer name when editing
  useEffect(() => {
    if (formData.referraluserid && !selectedReferrer) {
      fetchPartnerById(formData.referraluserid)
        .then((partner) => setSelectedReferrer(partner))
        .catch(() => {});
    }
  }, [formData.referraluserid, selectedReferrer]);

  useEffect(() => {
    if (selectedReferrer) {
      setReferrerQuery(selectedReferrer.name);
    }
  }, [selectedReferrer]);

  useEffect(() => {
    if (!formData.referraluserid) {
      setSelectedReferrer(null);
      setReferrerQuery('');
    }
  }, [formData.referraluserid]);

  // Debounced search
  useEffect(() => {
    if (referrerTimeoutRef.current) clearTimeout(referrerTimeoutRef.current);
    const trimmed = referrerQuery.trim();
    if (!trimmed || (selectedReferrer && referrerQuery === selectedReferrer.name)) {
      setReferrerResults([]);
      setReferrerLoading(false);
      return;
    }
    setReferrerLoading(true);
    referrerTimeoutRef.current = setTimeout(() => {
      fetchPartners({ search: trimmed, limit: 20 })
        .then((res) => setReferrerResults(res.items))
        .catch(() => setReferrerResults([]))
        .finally(() => setReferrerLoading(false));
    }, 300);
    return () => { if (referrerTimeoutRef.current) clearTimeout(referrerTimeoutRef.current); };
  }, [referrerQuery, selectedReferrer]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (referrerContainerRef.current && !referrerContainerRef.current.contains(e.target as Node)) {
        setReferrerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReferrerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setReferrerQuery(value);
    if (selectedReferrer && value !== selectedReferrer.name) {
      setSelectedReferrer(null);
      set('referraluserid', '');
    }
    setReferrerOpen(true);
  };

  const handleSelectReferrer = (partner: ApiPartner) => {
    setSelectedReferrer(partner);
    setReferrerQuery(partner.name);
    set('referraluserid', partner.id);
    setReferrerOpen(false);
  };

  const handleClearReferrer = () => {
    setReferrerQuery('');
    setSelectedReferrer(null);
    set('referraluserid', '');
    setReferrerResults([]);
  };
  // ────────────────────────────────────────────────────────────────────────

  // ─── Async employee search for sales staff ─────────────────────────────
  const [salesQuery, setSalesQuery] = useState('');
  const [salesResults, setSalesResults] = useState<ApiEmployee[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const salesTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const salesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (formData.salestaffid) {
      const emp = employees.find((e) => e.id === formData.salestaffid);
      if (emp) setSalesQuery(emp.name);
    } else {
      setSalesQuery('');
    }
  }, [formData.salestaffid, employees]);

  useEffect(() => {
    if (salesTimeoutRef.current) clearTimeout(salesTimeoutRef.current);
    const trimmed = salesQuery.trim();
    if (!trimmed) { setSalesResults([]); setSalesLoading(false); return; }
    setSalesLoading(true);
    salesTimeoutRef.current = setTimeout(() => {
      fetchEmployees({ search: trimmed, limit: 100 })
        .then((res) => {
          const filtered = res.items.filter((e) => {
            const jt = (e.jobtitle ?? '').toLowerCase();
            return jt.includes('sale');
          });
          setSalesResults(filtered);
        })
        .catch(() => setSalesResults([]))
        .finally(() => setSalesLoading(false));
    }, 300);
    return () => { if (salesTimeoutRef.current) clearTimeout(salesTimeoutRef.current); };
  }, [salesQuery]);

  const handleSalesInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSalesQuery(e.target.value);
    set('salestaffid', '');
    setSalesOpen(true);
  };
  const handleSelectSales = (emp: ApiEmployee) => {
    setSalesQuery(emp.name);
    set('salestaffid', emp.id);
    setSalesOpen(false);
  };
  const handleClearSales = () => {
    setSalesQuery('');
    set('salestaffid', '');
    setSalesResults([]);
  };
  // ────────────────────────────────────────────────────────────────────────

  // ─── Async employee search for CSKH ────────────────────────────────────
  const [cskhQuery, setCskhQuery] = useState('');
  const [cskhResults, setCskhResults] = useState<ApiEmployee[]>([]);
  const [cskhLoading, setCskhLoading] = useState(false);
  const [cskhOpen, setCskhOpen] = useState(false);
  const cskhTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const cskhContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (formData.cskhid) {
      const emp = employees.find((e) => e.id === formData.cskhid);
      if (emp) setCskhQuery(emp.name);
    } else {
      setCskhQuery('');
    }
  }, [formData.cskhid, employees]);

  useEffect(() => {
    if (cskhTimeoutRef.current) clearTimeout(cskhTimeoutRef.current);
    const trimmed = cskhQuery.trim();
    if (!trimmed) { setCskhResults([]); setCskhLoading(false); return; }
    setCskhLoading(true);
    cskhTimeoutRef.current = setTimeout(() => {
      fetchEmployees({ search: trimmed, limit: 100 })
        .then((res) => {
          const filtered = res.items.filter((e) => {
            const jt = (e.jobtitle ?? '').toLowerCase();
            return jt.includes('cskh') || jt.includes('customer service') || jt.includes('hỗ trợ');
          });
          setCskhResults(filtered);
        })
        .catch(() => setCskhResults([]))
        .finally(() => setCskhLoading(false));
    }, 300);
    return () => { if (cskhTimeoutRef.current) clearTimeout(cskhTimeoutRef.current); };
  }, [cskhQuery]);

  const handleCskhInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCskhQuery(e.target.value);
    set('cskhid', '');
    setCskhOpen(true);
  };
  const handleSelectCskh = (emp: ApiEmployee) => {
    setCskhQuery(emp.name);
    set('cskhid', emp.id);
    setCskhOpen(false);
  };
  const handleClearCskh = () => {
    setCskhQuery('');
    set('cskhid', '');
    setCskhResults([]);
  };
  // ────────────────────────────────────────────────────────────────────────

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (salesContainerRef.current && !salesContainerRef.current.contains(e.target as Node)) setSalesOpen(false);
      if (cskhContainerRef.current && !cskhContainerRef.current.contains(e.target as Node)) setCskhOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Live uniqueness checks for phone and email
  const phoneCheck = useUniqueFieldCheck({
    field: 'phone',
    value: formData.phone ?? '',
    excludeId: isEdit ? customerId : undefined,
    initialValue: isEdit ? (initialData?.phone ?? undefined) : undefined,
  });
  const emailCheck = useUniqueFieldCheck({
    field: 'email',
    value: formData.email ?? '',
    excludeId: isEdit ? customerId : undefined,
    initialValue: isEdit ? (initialData?.email ?? undefined) : undefined,
  });

  const setError = useCallback(
    (field: keyof CustomerFormData, message: string) => {
      setErrors((prev) => {
        const filtered = prev.filter((e) => e.field !== field);
        return [...filtered, { field, message }];
      });
    },
    [],
  );

  const clearError = useCallback(
    (field: keyof CustomerFormData) => {
      setErrors((prev) => prev.filter((e) => e.field !== field));
    },
    [],
  );

  // Reflect duplicate status into field errors; clear on unique verdict
  useEffect(() => {
    if (phoneCheck.status === 'duplicate' && phoneCheck.message) {
      setError('phone', phoneCheck.message);
    } else if (phoneCheck.status === 'unique') {
      clearError('phone');
    }
  }, [phoneCheck.status, phoneCheck.message, setError, clearError]);

  useEffect(() => {
    if (emailCheck.status === 'duplicate' && emailCheck.message) {
      setError('email', emailCheck.message);
    } else if (emailCheck.status === 'unique') {
      clearError('email');
    }
  }, [emailCheck.status, emailCheck.message, setError, clearError]);

  const handleAddSource = (name: string) => {
    addSource({
      name,
      type: 'offline',
      description: 'Custom source',
      isActive: true,
    });
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const validationErrors = validateCustomerForm(formData);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        const firstErrorField = validationErrors[0].field;
        if (firstErrorField === 'medicalhistory') setActiveTab('medical');
        else if (['isbusinessinvoice', 'unitname', 'taxcode'].includes(firstErrorField)) setActiveTab('einvoice');
        else setActiveTab('basic');
        return;
      }
      setIsSubmitting(true);
      try {
        await onSubmit(formData);
      } catch (err) {
        console.error('Save customer error:', err);
        if (err instanceof ApiError) {
          if ((err.code === 'DUPLICATE_FIELD') && (err.field === 'phone' || err.field === 'email')) {
            setErrors([{ field: err.field, message: err.message }]);
          } else if (err.code === 'VALIDATION') {
            setErrors([{ field: 'name', message: err.message }]);
          } else {
            setErrors([{ field: 'name', message: t('errors.saveFailed', 'Lỗi lưu dữ liệu. Vui lòng thử lại.') }]);
          }
        } else {
          setErrors([{ field: 'name', message: t('errors.saveFailed', 'Lỗi lưu dữ liệu. Vui lòng thử lại.') }]);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSubmit, t],
  );

  const findBestMatch = (input: string, options: readonly string[]): string | null => {
    if (!input || options.length === 0) return null;
    const normalizedInput = normalizeText(input);
    const exactMatch = options.find((opt) => opt.toLowerCase() === input.toLowerCase());
    if (exactMatch) return exactMatch;
    const normalizedMatch = options.find((opt) => {
      const normalizedOpt = normalizeText(opt);
      return normalizedOpt === normalizedInput;
    });
    if (normalizedMatch) return normalizedMatch;
    const partialMatch = options.find((opt) => {
      const normalizedOpt = normalizeText(opt);
      return normalizedOpt.includes(normalizedInput) || normalizedInput.includes(normalizedOpt);
    });
    if (partialMatch) return partialMatch;
    const inputWords = normalizedInput.split(/\s+/);
    let bestMatch: string | null = null;
    let bestScore = 0;
    for (const option of options) {
      const normalizedOpt = normalizeText(option);
      const optWords = normalizedOpt.split(/\s+/);
      let score = 0;
      for (const word of inputWords) {
        if (word.length > 2 && optWords.some((optWord) => optWord.includes(word))) {
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

  const selectedSource = allSources.find((s) => s.id === formData.sourceid);

  return (
    <div className="flex flex-col bg-gray-50/50 overflow-hidden flex-1" onWheel={(e) => e.stopPropagation()}>
      <MiniAddDialog
        isOpen={showSourceDialog}
        onClose={() => setShowSourceDialog(false)}
        title={t('sources.other', { ns: 'customers' })}
        placeholder={t('form.fullName', { ns: 'customers' })}
        onSubmit={handleAddSource}
      />

      {/* ═══════════════════════════════════════════════════════════════════════════════
          HEADER — Appointment module style (icon + title + subtitle)
         ═══════════════════════════════════════════════════════════════════════════════ */}
      <div className="relative px-6 py-5 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 flex-shrink-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              {isEdit ? (
                <Edit2 className="w-5 h-5 text-white" />
              ) : (
                <CalendarPlus className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isEdit ? t('editCustomer') : t('addCustomer')}
              </h2>
              <p className="text-sm text-orange-100 mt-0.5">
                {isEdit ? t('subtitle.edit', 'Cập nhật thông tin hồ sơ bệnh nhân') : t('subtitle.create', 'Tạo hồ sơ bệnh nhân mới')}
              </p>
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

      <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 overflow-hidden">
        {/* ══ LEFT PANEL ════════════════════════════════════════════════════════════ */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col gap-4 px-5 py-5 overflow-hidden bg-gray-50/30">
          {/* Card 1: Personal Info */}
          <CardSection title={t('profileSection.personalInfo', { ns: 'customers' })} icon={User} maxHeight="280px">
            <div className="flex justify-center mb-4">
              <CustomerCameraWidget
                disabled={!isFieldEditable}
                onQuickAddResult={(fields) => {
                  setFormData((prev) => ({ ...prev, ...fields }));
                  setErrors((prev) =>
                    prev.filter((e) => !Object.keys(fields).includes(e.field)),
                  );
                }}
                onFaceIdResult={(customer, imageBlob) => {
                  if (customer) {
                    setFormData((prev) => ({ ...prev, ...customer }));
                    setErrors((prev) =>
                      prev.filter((e) => !Object.keys(customer).includes(e.field)),
                    );
                    setPendingFaceImage(null);
                  } else {
                    setPendingFaceImage(imageBlob ?? null);
                  }
                }}
              />
            </div>

            {/* Register Face button */}
            {isEdit && customerId && (
              <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  resetFace();
                  setShowRegisterModal(true);
                }}
                disabled={!isFieldEditable || registerState.status === 'processing'}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-all disabled:opacity-50"
              >
                <ScanFace className="w-4 h-4" />
                {registerState.status === 'processing' ? t('face.registering', 'Đang đăng ký...') : t('face.register', 'Đăng ký khuôn mặt')}
              </button>
              {registerState.status === 'success' && (
                <p className="mt-1.5 text-[10px] text-emerald-600 text-center">{t('face.registerSuccess', 'Đăng ký thành công!')}</p>
              )}
              {registerState.status === 'error' && (
                <p className="mt-1.5 text-[10px] text-red-500 text-center">
                  {(registerState as { message: string }).message}
                </p>
              )}
            </div>
          )}

          {/* No-match hint in add mode */}
          {!isEdit && pendingFaceImage && (
            <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-[10px] text-amber-700 text-center">
                {t('face.savedHint', 'Ảnh khuôn mặt đã lưu. Điền thông tin và lưu để đăng ký.')}
              </p>
            </div>
          )}

            <div className="space-y-4">
              {/* Name */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <FieldLabel icon={User} required>
                    {t('form.fullName')}
                  </FieldLabel>
                  <button
                    type="button"
                    onClick={() => setNameUppercase((v) => !v)}
                    className={`text-[10px] px-2 py-1 rounded-md border font-medium transition-colors ${
                      nameUppercase
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {t('uppercase', 'IN HOA')}
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => set('name', nameUppercase ? e.target.value.toUpperCase() : e.target.value)}
                  placeholder={t('form.fullName', { ns: 'customers' })}
                  disabled={!isFieldEditable}
                  className={inputClass(!!getError('name'), !isFieldEditable)}
                  style={nameUppercase ? { textTransform: 'uppercase' } : {}}
                />
                {getError('name') && <p className="mt-1 text-xs text-red-500">{getError('name')}</p>}
              </div>

              {/* Gender */}
              <div>
                <FieldLabel icon={Users}>{t('form.gender')}</FieldLabel>
                <div className="flex gap-4">
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <label
                      key={g}
                      className={`flex items-center gap-2 text-sm ${
                        !isFieldEditable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        checked={formData.gender === g}
                        onChange={() => isFieldEditable && set('gender', g)}
                        disabled={!isFieldEditable}
                        className="accent-orange-500 w-4 h-4"
                      />
                      <span className="text-gray-700">{t(`form.${g}`)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Phone */}
              <div>
                <FieldLabel icon={Phone} required>
                  {t('form.phone')}
                </FieldLabel>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="0901 111 222"
                    className={`${inputClass(!!getError('phone'))} flex-1`}
                  />
                  <button
                    type="button"
                    title="Số khẩn cấp"
                    className="px-3 py-2 border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {getError('phone') && <p className="mt-1 text-xs text-red-500">{getError('phone')}</p>}
                {phoneCheck.status === 'error' && !getError('phone') && (
                  <p className="mt-1 text-xs text-gray-400">{phoneCheck.message}</p>
                )}
              </div>
            </div>
          </CardSection>

          {/* Card 2: Assignment */}
          <CardSection
            title={t('profileSection.assignments', { ns: 'customers' })}
            icon={Briefcase}
            action={<span className="text-xs text-gray-400">{employees.length} {t('employeeCount', 'nhân viên')}</span>}
            className="flex-1 min-h-0"
          >
            <div className="space-y-4">
              {/* Branch */}
              <div>
                <FieldLabel icon={MapPin} required>
                  {t('form.location')}
                </FieldLabel>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    value={formData.companyid}
                    onChange={(e) => set('companyid', e.target.value)}
                    className={`${selectClass()} pl-9`}
                  >
                    <option value="">-- {t('select.branch', 'Chọn chi nhánh')} --</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                {getError('companyid') && <p className="mt-1 text-xs text-red-500">{getError('companyid')}</p>}
              </div>

              {/* Sales staff */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <FieldLabel icon={Users}>{t('form.salesStaff', 'Nhân viên sale')}</FieldLabel>
                </div>
                <div ref={salesContainerRef} className="relative">
                  <input
                    type="text"
                    value={salesQuery}
                    onChange={handleSalesInputChange}
                    onFocus={() => setSalesOpen(true)}
                    placeholder={t('salesPlaceholder', 'Nhập tên nhân viên sale...')}
                    className={inputClass(false)}
                  />
                  {salesQuery && (
                    <button
                      type="button"
                      onClick={handleClearSales}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {salesOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[100] max-h-60 overflow-y-auto">
                      {salesLoading ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">{t('loading', 'Đang tìm...')}</div>
                      ) : salesResults.length > 0 ? (
                        salesResults.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => handleSelectSales(emp)}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 text-gray-700 flex flex-col gap-0.5"
                          >
                            <span className="font-medium">{emp.name}</span>
                            {emp.phone && <span className="text-xs text-gray-400">{emp.phone}</span>}
                          </button>
                        ))
                      ) : salesQuery.trim().length > 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">{t('noResults', 'Không tìm thấy kết quả')}</div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* CSKH */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <FieldLabel icon={Phone}>{t('form.cskh', 'CSKH')}</FieldLabel>
                </div>
                <div ref={cskhContainerRef} className="relative">
                  <input
                    type="text"
                    value={cskhQuery}
                    onChange={handleCskhInputChange}
                    onFocus={() => setCskhOpen(true)}
                    placeholder={t('cskhPlaceholder', 'Nhập tên CSKH...')}
                    className={inputClass(false)}
                  />
                  {cskhQuery && (
                    <button
                      type="button"
                      onClick={handleClearCskh}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {cskhOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[100] max-h-60 overflow-y-auto">
                      {cskhLoading ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">{t('loading', 'Đang tìm...')}</div>
                      ) : cskhResults.length > 0 ? (
                        cskhResults.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => handleSelectCskh(emp)}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 text-gray-700 flex flex-col gap-0.5"
                          >
                            <span className="font-medium">{emp.name}</span>
                            {emp.phone && <span className="text-xs text-gray-400">{emp.phone}</span>}
                          </button>
                        ))
                      ) : cskhQuery.trim().length > 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">{t('noResults', 'Không tìm thấy kết quả')}</div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* Referral */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <FieldLabel icon={Users}>{t('form.referrer', 'Ngưới giới thiệu')}</FieldLabel>
                </div>
                <div ref={referrerContainerRef} className="relative">
                  <input
                    type="text"
                    value={referrerQuery}
                    onChange={handleReferrerInputChange}
                    onFocus={() => setReferrerOpen(true)}
                    placeholder={t('referrerPlaceholder', 'Nhập tên hoặc số điện thoại...')}
                    className={inputClass(false)}
                  />
                  {referrerQuery && (
                    <button
                      type="button"
                      onClick={handleClearReferrer}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {referrerOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[100] max-h-60 overflow-y-auto">
                      {referrerLoading ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">{t('loading', 'Đang tìm...')}</div>
                      ) : referrerResults.length > 0 ? (
                        referrerResults.map((partner) => (
                          <button
                            key={partner.id}
                            type="button"
                            onClick={() => handleSelectReferrer(partner)}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 text-gray-700 flex flex-col gap-0.5"
                          >
                            <span className="font-medium">{partner.name}</span>
                            {partner.phone && <span className="text-xs text-gray-400">{partner.phone}</span>}
                          </button>
                        ))
                      ) : referrerQuery.trim().length > 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">{t('noResults', 'Không tìm thấy kết quả')}</div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* Source */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <FieldLabel icon={Link}>{t('form.source')}</FieldLabel>
                  <button
                    type="button"
                    onClick={() => setShowSourceDialog(true)}
                    className="p-1 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                    title={t('dialog.addSource', 'Thêm nguồn mới')}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <select value={formData.sourceid} onChange={(e) => set('sourceid', e.target.value)} className={selectClass()}>
                  <option value="">-- {t('select.source', 'Chọn nguồn')} --</option>
                  {allSources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {selectedSource && (
                  <div
                    className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border ${TYPE_COLORS[selectedSource.type]}`}
                  >
                    {TYPE_ICONS[selectedSource.type]}
                    <span>
                      {selectedSource.type === 'online'
                        ? 'Online'
                        : selectedSource.type === 'offline'
                        ? 'Offline'
                        : t('sources.referral')}
                    </span>
                  </div>
                )}
              </div>

            </div>
          </CardSection>

        </div>

        {/* ══ RIGHT PANEL ═══════════════════════════════════════════════════════════ */}
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
                {t(tab.labelKey)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-8 py-6 custom-scrollbar">
            {activeTab === 'basic' && (
              <div className="max-w-4xl">
                <h3 className="text-sm font-semibold text-gray-800 pb-2 border-b border-gray-100 flex items-center gap-2 mb-5">
                  <Info className="w-4 h-4 text-orange-500" />
                  {t('section.detailInfo', 'Thông tin chi tiết')}
                </h3>

                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  {/* DOB */}
                  <div>
                    <FieldLabel icon={Calendar}>{t('form.dateOfBirth')}</FieldLabel>
                    <div className="flex gap-2">
                      <select
                        value={formData.birthday ?? ''}
                        onChange={(e) => set('birthday', e.target.value ? Number(e.target.value) : null)}
                        disabled={!isFieldEditable}
                        className={`flex-1 ${selectClass(!isFieldEditable)}`}
                      >
                        <option value="">{t('date.day', 'Ngày')}</option>
                        {DAYS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <select
                        value={formData.birthmonth ?? ''}
                        onChange={(e) => set('birthmonth', e.target.value ? Number(e.target.value) : null)}
                        disabled={!isFieldEditable}
                        className={`flex-1 ${selectClass(!isFieldEditable)}`}
                      >
                        <option value="">{t('date.month', 'Tháng')}</option>
                        {MONTHS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <select
                        value={formData.birthyear ?? ''}
                        onChange={(e) => set('birthyear', e.target.value ? Number(e.target.value) : null)}
                        disabled={!isFieldEditable}
                        className={`flex-1 ${selectClass(!isFieldEditable)}`}
                      >
                        <option value="">{t('date.year', 'Năm')}</option>
                        {YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Created date */}
                  <div>
                    <FieldLabel icon={Clock}>{t('createdDate', 'Ngày tạo')}</FieldLabel>
                    <input
                      type="text"
                      value={today}
                      readOnly
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-default"
                    />
                  </div>

                  {/* Title */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <FieldLabel icon={User}>{t('form.titleLabel', 'Danh xưng')}</FieldLabel>
                      <button
                        type="button"
                        onClick={() => alert(t('messages.titleComingSoon', 'Tính năng thêm danh xưng tuỳ chỉnh sẽ được phát triển sau'))}
                        className="p-1 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <select value={formData.title} onChange={(e) => set('title', e.target.value)} className={selectClass()}>
                      <option value="">-- {t('select.title', 'Chọn danh xưng')} --</option>
                      {TITLE_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Customer code */}
                  <div>
                    <FieldLabel icon={Building2}>{t('form.customerCode', 'Mã khách hàng')}</FieldLabel>
                    <input
                      type="text"
                      value={isEdit ? (formData.ref || displayRef || '') : (displayRef ?? t('auto', '(Tự động)'))}
                      onChange={isEdit ? (e) => set('ref', e.target.value) : undefined}
                      readOnly={!isEdit}
                      placeholder={t('auto', '(Tự động)')}
                      className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm ${
                        isEdit
                          ? 'bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all'
                          : 'bg-gray-50 text-gray-500 cursor-default'
                      }`}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <FieldLabel icon={Mail}>{t('form.email')}</FieldLabel>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="email@example.com"
                      className={inputClass(!!getError('email'))}
                    />
                    {getError('email') && <p className="mt-1 text-xs text-red-500">{getError('email')}</p>}
                    {emailCheck.status === 'error' && !getError('email') && (
                      <p className="mt-1 text-xs text-gray-400">{emailCheck.message}</p>
                    )}
                  </div>

                  {/* Country */}
                  <div>
                    <FieldLabel icon={Globe}>{t('form.country', 'Quốc gia')}</FieldLabel>
                    <input type="text" defaultValue="Viet Nam" className={inputClass(false)} />
                  </div>

                  {/* Weight */}
                  <div>
                    <FieldLabel icon={Scale}>{t('form.weight', 'Cân nặng (Kg)')}</FieldLabel>
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
                    <FieldLabel icon={MapPin}>{t('form.street', 'Số nhà / Địa chỉ')}</FieldLabel>
                    <AddressAutocomplete
                      value={formData.street}
                      onChange={(address, details) => {
                        // Batch all address updates into a single setFormData call
                        const updates: Partial<CustomerFormData> = {
                          street: address,
                        };

                        if (details) {
                          const matchedCity = details.city ? findBestMatch(details.city, VIET_CITIES) : null;
                          if (matchedCity) {
                            updates.cityname = matchedCity;

                            const districts = VIET_DISTRICTS[matchedCity] || [];
                            const matchedDistrict = details.district ? findBestMatch(details.district, districts) : null;
                            if (matchedDistrict) {
                              updates.districtname = matchedDistrict;

                              const wards = VIET_WARDS[matchedDistrict] || [];
                              const matchedWard = details.ward ? findBestMatch(details.ward, wards) : null;
                              if (matchedWard) {
                                updates.wardname = matchedWard;
                              }
                            }
                          }
                        }

                        // Update all fields at once
                        setFormData((prev) => ({ ...prev, ...updates }));
                        // Clear any address-related errors
                        setErrors((prev) => prev.filter((e) => !['street', 'cityname', 'districtname', 'wardname'].includes(e.field)));
                      }}
                      placeholder={t('addressPlaceholder', 'Nhập địa chỉ (ví dụ: 123 Nguyễn Huệ...)')}
                    />
                    <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-orange-500" />
                      {t('addressHint', 'Gõ địa chỉ để tự động điền Tỉnh/Thành, Quận/Huyện, Phường/Xã')}
                    </p>
                  </div>

                  {/* Occupation */}
                  <div>
                    <FieldLabel icon={Briefcase}>{t('form.jobTitle', 'Nghề nghiệp')}</FieldLabel>
                    <input
                      type="text"
                      value={formData.jobtitle}
                      onChange={(e) => set('jobtitle', e.target.value)}
                      placeholder={t('jobPlaceholder', 'Nhân viên văn phòng')}
                      className={inputClass(false)}
                    />
                  </div>

                  {/* Province/City */}
                  <div>
                    <FieldLabel icon={MapPin}>{t('form.city', 'Tỉnh/Thành')}</FieldLabel>
                    <select
                      value={formData.cityname}
                      onChange={(e) => {
                        set('cityname', e.target.value);
                        set('districtname', '');
                        set('wardname', '');
                      }}
                      className={selectClass()}
                    >
                      <option value="">-- {t('select.city', 'Chọn Tỉnh/Thành')} --</option>
                      {VIET_CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Health insurance */}
                  <div>
                    <FieldLabel icon={ShieldCheck}>{t('form.healthInsurance', 'Số thẻ bảo hiểm y tế')}</FieldLabel>
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
                    <FieldLabel icon={MapPin}>{t('form.district', 'Quận/Huyện')}</FieldLabel>
                    <ComboboxInput
                      value={formData.districtname}
                      onChange={(value) => {
                        set('districtname', value);
                        // Clear ward if district changes
                        if (value !== formData.districtname) {
                          set('wardname', '');
                        }
                      }}
                      options={districtsForCity}
                      placeholder={t('select.districtPlaceholder', '-- Chọn hoặc nhập Quận/Huyện --')}
                      disabled={!formData.cityname}
                    />
                    {formData.cityname && !formData.districtname && (
                      <p className="mt-1 text-xs text-orange-600">
                        {t('districtHint', 'Nhập hoặc chọn Quận/Huyện từ danh sách')}
                      </p>
                    )}
                  </div>

                  {/* ID / Passport */}
                  <div>
                    <FieldLabel icon={CreditCard}>{t('form.identity', 'Căn cước / Hộ chiếu')}</FieldLabel>
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
                    <FieldLabel icon={MapPin}>{t('form.ward', 'Phường/Xã')}</FieldLabel>
                    <ComboboxInput
                      value={formData.wardname}
                      onChange={(value) => set('wardname', value)}
                      options={wardsForDistrict}
                      placeholder={t('select.wardPlaceholder', '-- Chọn hoặc nhập Phường/Xã --')}
                      disabled={!formData.districtname}
                    />
                    {formData.districtname && !formData.wardname && wardsForDistrict.length > 0 && (
                      <p className="mt-1 text-xs text-orange-600">
                        {t('wardHint', 'Nhập hoặc chọn Phường/Xã từ danh sách')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'medical' && (
              <div className="max-w-3xl">
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-4">
                  <h4 className="text-sm font-medium text-orange-800 mb-1">{t('medicalNotice.title', 'Lưu ý y tế')}</h4>
                  <p className="text-xs text-orange-600">
                    {t('medicalNotice.description', 'Thông tin tiểu sử bệnh giúp bác sĩ đánh giá tốt hơn tình trạng sức khỏe của bệnh nhân.')}
                  </p>
                </div>
                <FieldLabel icon={Stethoscope}>{t('form.medicalHistory', 'Tiểu sử bệnh')}</FieldLabel>
                <textarea
                  value={formData.medicalhistory}
                  onChange={(e) => set('medicalhistory', e.target.value)}
                  placeholder={t('medicalHistoryPlaceholder', 'Nhập tiểu sử bệnh, dị ứng, thuốc đang dùng...')}
                  rows={8}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none transition-all hover:border-gray-300"
                />
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    t('conditions.diabetes', 'Tiểu đường'),
                    t('conditions.cardiovascular', 'Tim mạch'),
                    t('conditions.drugAllergy', 'Dị ứng thuốc'),
                    t('conditions.hypertension', 'Huyết áp cao'),
                    t('conditions.asthma', 'Hen suyễn'),
                    t('conditions.pregnant', 'Đang mang thai'),
                  ].map((cond) => (
                    <label
                      key={cond}
                      className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="accent-orange-500 w-4 h-4 rounded"
                        onChange={(e) => {
                          if (e.target.checked) {
                            set('medicalhistory', formData.medicalhistory ? `${formData.medicalhistory}\n${cond}` : cond);
                          }
                        }}
                      />
                      <span>{cond}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

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
                    {t('einvoice.businessInvoice', 'Xuất hóa đơn doanh nghiệp')}
                  </label>
                </div>

                {formData.isbusinessinvoice && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="col-span-2">
                      <FieldLabel>{t('einvoice.companyName', 'Tên công ty')}</FieldLabel>
                      <input
                        type="text"
                        value={formData.unitname}
                        onChange={(e) => set('unitname', e.target.value)}
                        placeholder={t('einvoice.companyPlaceholder', 'Công ty TNHH...')}
                        className={inputClass(false)}
                      />
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>{t('einvoice.companyAddress', 'Địa chỉ công ty')}</FieldLabel>
                      <input
                        type="text"
                        value={formData.unitaddress}
                        onChange={(e) => set('unitaddress', e.target.value)}
                        placeholder={t('einvoice.addressPlaceholder', '123 Đường...')}
                        className={inputClass(false)}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t('einvoice.taxCode', 'Mã số thuế')}</FieldLabel>
                      <input
                        type="text"
                        value={formData.taxcode}
                        onChange={(e) => set('taxcode', e.target.value)}
                        placeholder="0123456789"
                        className={inputClass(false)}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t('einvoice.recipientName', 'Họ tên ngưới nhận')}</FieldLabel>
                      <input
                        type="text"
                        value={formData.personalname}
                        onChange={(e) => set('personalname', e.target.value)}
                        placeholder={t('einvoice.namePlaceholder', 'Nguyễn Văn A')}
                        className={inputClass(false)}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t('einvoice.recipientId', 'CCCD ngưới nhận')}</FieldLabel>
                      <input
                        type="text"
                        value={formData.personalidentitycard}
                        onChange={(e) => set('personalidentitycard', e.target.value)}
                        placeholder="0xxxxxxxxx"
                        className={inputClass(false)}
                      />
                    </div>
                    <div>
                      <FieldLabel>{t('einvoice.personalTaxCode', 'MST cá nhân')}</FieldLabel>
                      <input
                        type="text"
                        value={formData.personaltaxcode}
                        onChange={(e) => set('personaltaxcode', e.target.value)}
                        placeholder="0xxxxxxxxx"
                        className={inputClass(false)}
                      />
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>{t('einvoice.recipientAddress', 'Địa chỉ ngưới nhận')}</FieldLabel>
                      <input
                        type="text"
                        value={formData.personaladdress}
                        onChange={(e) => set('personaladdress', e.target.value)}
                        placeholder={t('einvoice.addressPlaceholder', '123 Đường...')}
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
                    <p className="text-sm text-gray-500">{t('einvoice.toggleHint', 'Bật tùy chọn trên để nhập thông tin hóa đơn doanh nghiệp.')}</p>
                  </div>
                )}
              </div>
            )}

            {/* Notes — moved from left panel for better balance */}
            <CardSection title={t('form.notes')} icon={FileText} maxHeight="180px">
              <textarea
                value={formData.note}
                onChange={(e) => set('note', e.target.value)}
                placeholder={t('notesPlaceholder', 'Ghi chú về khách hàng...')}
                rows={3}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none transition-all hover:border-gray-300"
              />
            </CardSection>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-gray-200 flex-shrink-0 bg-gradient-to-b from-gray-50 to-white flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
            >
              {t('close', 'Đóng')}
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                phoneCheck.status === 'checking' ||
                phoneCheck.status === 'duplicate' ||
                emailCheck.status === 'checking' ||
                emailCheck.status === 'duplicate'
              }
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl hover:from-orange-600 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
            >
              {isSubmitting ? t('saving', 'Đang lưu...') : isEdit ? t('update', 'Cập nhật') : t('save', 'Lưu')}
            </button>
          </div>
        </div>
      </form>

      <FaceCaptureModal
        isOpen={showRegisterModal}
        title={t('face.registerTitle', 'Đăng ký khuôn mặt')}
        onCapture={async (imageBlob) => {
          setShowRegisterModal(false);
          if (customerId) {
            await register(customerId, imageBlob);
          }
        }}
        onCancel={() => setShowRegisterModal(false)}
      />
    </div>
  );
}
