import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimezone } from '@/contexts/TimezoneContext';
import { fetchCompanies, fetchEmployees, fetchPartners, fetchPartnerById, ApiError } from '@/lib/api';
import { normalizeText } from '@/lib/utils';
import type { ApiCompany, ApiEmployee, ApiPartner } from '@/lib/api';
import { useUniqueFieldCheck } from '@/hooks/useUniqueFieldCheck';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import type { CustomerFormData, FormValidationError } from '@/data/mockCustomerForm';
import { EMPTY_CUSTOMER_FORM, validateCustomerForm, VIET_DISTRICTS, VIET_WARDS } from '@/data/mockCustomerForm';
import type { AddCustomerFormProps } from './AddCustomerForm';
import type { TabId } from './constants';

export interface ApiErrorDetail {
  readonly message: string;
  readonly status?: number;
  readonly code?: string;
  readonly field?: string;
  readonly detail?: string;
  readonly hint?: string;
  readonly raw?: unknown;
}

export interface UseAddCustomerFormResult {
  readonly t: (key: string, opts?: any) => string;
  readonly isFieldEditable: boolean;
  readonly isEdit: boolean;
  readonly canEdit: boolean;
  readonly customerId?: string;
  readonly formData: CustomerFormData;
  readonly setFormData: React.Dispatch<React.SetStateAction<CustomerFormData>>;
  readonly errors: readonly FormValidationError[];
  readonly setErrors: React.Dispatch<React.SetStateAction<readonly FormValidationError[]>>;
  readonly apiErrorDetail: ApiErrorDetail | null;
  readonly setApiErrorDetail: React.Dispatch<React.SetStateAction<ApiErrorDetail | null>>;
  readonly activeTab: TabId;
  readonly setActiveTab: React.Dispatch<React.SetStateAction<TabId>>;
  readonly isSubmitting: boolean;
  readonly setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  readonly nameUppercase: boolean;
  readonly setNameUppercase: React.Dispatch<React.SetStateAction<boolean>>;
  readonly displayRef: string | null;
  readonly setDisplayRef: React.Dispatch<React.SetStateAction<string | null>>;
  readonly companies: ApiCompany[];
  readonly employees: ApiEmployee[];
  readonly pendingFaceImage: Blob | null;
  readonly setPendingFaceImage: React.Dispatch<React.SetStateAction<Blob | null>>;
  readonly showRegisterModal: boolean;
  readonly setShowRegisterModal: React.Dispatch<React.SetStateAction<boolean>>;
  readonly registerState: any;
  readonly register: (id: string, blob: Blob) => Promise<void>;
  readonly resetFace: () => void;
  readonly referrerQuery: string;
  readonly setReferrerQuery: React.Dispatch<React.SetStateAction<string>>;
  readonly referrerResults: ApiPartner[];
  readonly referrerLoading: boolean;
  readonly referrerOpen: boolean;
  readonly setReferrerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  readonly selectedReferrer: ApiPartner | null;
  readonly setSelectedReferrer: React.Dispatch<React.SetStateAction<ApiPartner | null>>;
  readonly referrerContainerRef: React.RefObject<HTMLDivElement>;
  readonly handleReferrerInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly handleSelectReferrer: (partner: ApiPartner) => void;
  readonly handleClearReferrer: () => void;
  readonly salesQuery: string;
  readonly setSalesQuery: React.Dispatch<React.SetStateAction<string>>;
  readonly salesResults: ApiEmployee[];
  readonly salesLoading: boolean;
  readonly salesOpen: boolean;
  readonly setSalesOpen: React.Dispatch<React.SetStateAction<boolean>>;
  readonly salesContainerRef: React.RefObject<HTMLDivElement>;
  readonly handleSalesInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly handleSelectSales: (emp: ApiEmployee) => void;
  readonly handleClearSales: () => void;
  readonly cskhQuery: string;
  readonly setCskhQuery: React.Dispatch<React.SetStateAction<string>>;
  readonly cskhResults: ApiEmployee[];
  readonly cskhLoading: boolean;
  readonly cskhOpen: boolean;
  readonly setCskhOpen: React.Dispatch<React.SetStateAction<boolean>>;
  readonly cskhContainerRef: React.RefObject<HTMLDivElement>;
  readonly handleCskhInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly handleSelectCskh: (emp: ApiEmployee) => void;
  readonly handleClearCskh: () => void;
  readonly getError: (field: keyof CustomerFormData) => string | undefined;
  readonly set: <K extends keyof CustomerFormData>(field: K, value: CustomerFormData[K]) => void;
  readonly setError: (field: keyof CustomerFormData, message: string) => void;
  readonly clearError: (field: keyof CustomerFormData) => void;
  readonly phoneCheck: any;
  readonly emailCheck: any;
  readonly handleSubmit: (e: React.FormEvent) => Promise<void>;
  readonly findBestMatch: (input: string, options: readonly string[]) => string | null;
  readonly districtsForCity: readonly string[];
  readonly wardsForDistrict: readonly string[];
  readonly today: string;
  readonly onSubmit: (data: CustomerFormData) => void | Promise<void>;
  readonly onCancel: () => void;
  readonly onPendingFaceImage?: (image: Blob | null) => void;
  readonly initialData?: Partial<CustomerFormData>;
}

export function useAddCustomerForm(props: AddCustomerFormProps): UseAddCustomerFormResult {
  const {
    initialData,
    customerRef,
    customerId,
    onSubmit,
    onCancel,
    onPendingFaceImage,
    isEdit = false,
    canEdit = false,
  } = props;
  const { t } = useTranslation('customers');
  const isFieldEditable = !isEdit || canEdit;
  const [formData, setFormData] = useState<CustomerFormData>({
    ...EMPTY_CUSTOMER_FORM,
    ...(initialData ?? {}),
  });
  const [errors, setErrors] = useState<readonly FormValidationError[]>([]);
  const [apiErrorDetail, setApiErrorDetail] = useState<ApiErrorDetail | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameUppercase, setNameUppercase] = useState(false);
  const [displayRef, setDisplayRef] = useState<string | null>(customerRef ?? null);

  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);

  const [pendingFaceImage, setPendingFaceImage] = useState<Blob | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const { registerState, register, reset: resetFace } = useFaceRecognition();

  useEffect(() => {
    onPendingFaceImage?.(pendingFaceImage);
  }, [pendingFaceImage, onPendingFaceImage]);

  useEffect(() => {
    fetchCompanies({ limit: 50 }).then((r) => setCompanies(r.items)).catch(() => {});
    fetchEmployees({ limit: 500 }).then((r) => setEmployees(r.items)).catch(() => {});
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
    if (!trimmed) {
      const filtered = employees.filter((e) => {
        const jt = (e.jobtitle ?? '').toLowerCase();
        return jt.includes('sale');
      });
      setSalesResults(filtered);
      setSalesLoading(false);
      return;
    }
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
  }, [salesQuery, employees]);

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
    if (!trimmed) {
      const filtered = employees.filter((e) => {
        const jt = (e.jobtitle ?? '').toLowerCase();
        return jt.includes('cskh') || jt.includes('customer service') || jt.includes('hỗ trợ');
      });
      setCskhResults(filtered);
      setCskhLoading(false);
      return;
    }
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
  }, [cskhQuery, employees]);

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
      setError('phone', t(phoneCheck.message));
    } else if (phoneCheck.status === 'unique') {
      clearError('phone');
    }
  }, [phoneCheck.status, phoneCheck.message, setError, clearError, t]);

  useEffect(() => {
    if (emailCheck.status === 'duplicate' && emailCheck.message) {
      setError('email', t(emailCheck.message));
    } else if (emailCheck.status === 'unique') {
      clearError('email');
    }
  }, [emailCheck.status, emailCheck.message, setError, clearError, t]);

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
      setApiErrorDetail(null);
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
            setErrors([{ field: 'name', message: err.message }]);
            setApiErrorDetail({
              message: err.message,
              status: err.status,
              code: err.code,
              field: err.field,
              detail: (err.body as any)?.error?.detail ?? undefined,
              hint: (err.body as any)?.error?.hint ?? undefined,
              raw: err.body,
            });
          }
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          setErrors([{ field: 'name', message: msg }]);
          setApiErrorDetail({ message: msg, raw: err });
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

  const { getToday } = useTimezone();
  const today = getToday();

  return {
    t, isFieldEditable, isEdit, canEdit, customerId, formData, setFormData, errors, setErrors,
    apiErrorDetail, setApiErrorDetail, activeTab, setActiveTab, isSubmitting, setIsSubmitting, nameUppercase, setNameUppercase,
    displayRef, setDisplayRef, companies, employees,
    pendingFaceImage, setPendingFaceImage, showRegisterModal, setShowRegisterModal,
    registerState, register, resetFace,
    referrerQuery, setReferrerQuery, referrerResults, referrerLoading, referrerOpen, setReferrerOpen,
    selectedReferrer, setSelectedReferrer, referrerContainerRef, handleReferrerInputChange, handleSelectReferrer, handleClearReferrer,
    salesQuery, setSalesQuery, salesResults, salesLoading, salesOpen, setSalesOpen, salesContainerRef,
    handleSalesInputChange, handleSelectSales, handleClearSales,
    cskhQuery, setCskhQuery, cskhResults, cskhLoading, cskhOpen, setCskhOpen, cskhContainerRef,
    handleCskhInputChange, handleSelectCskh, handleClearCskh,
    getError, set, setError, clearError, phoneCheck, emailCheck, handleSubmit,
    findBestMatch, districtsForCity, wardsForDistrict, today,
    onSubmit, onCancel, onPendingFaceImage, initialData,
  };
}
