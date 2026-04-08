/**
 * Customer Form data types and helpers
 * @crossref:used-in[AddCustomerForm, Customers]
 */

export interface CustomerFormData {
  // Core
  name: string;
  phone: string;
  email: string;
  gender: 'male' | 'female' | 'other' | '';
  emergencyphone: string;

  // Location
  companyid: string;

  // DOB
  birthday: number | null;
  birthmonth: number | null;
  birthyear: number | null;

  // Personal
  weight: number | null;
  jobtitle: string;
  street: string;
  cityname: string;
  districtname: string;
  wardname: string;
  identitynumber: string;
  healthinsurancecardnumber: string;

  // Title / Salutation
  title: string;

  // Source / referral
  sourceid: string;
  referraluserid: string;
  salestaffid: string;
  cskhid: string;

  // Notes
  note: string;
  comment: string;
  medicalhistory: string;

  // E-Invoice
  isbusinessinvoice: boolean;
  unitname: string;
  unitaddress: string;
  taxcode: string;
  personalname: string;
  personalidentitycard: string;
  personaltaxcode: string;
  personaladdress: string;

  // Avatar
  photoUrl: string;
}

export const EMPTY_CUSTOMER_FORM: CustomerFormData = {
  name: '',
  phone: '',
  email: '',
  gender: '',
  emergencyphone: '',
  companyid: '',
  birthday: null,
  birthmonth: null,
  birthyear: null,
  weight: null,
  jobtitle: '',
  street: '',
  cityname: '',
  districtname: '',
  wardname: '',
  identitynumber: '',
  healthinsurancecardnumber: '',
  title: '',
  sourceid: '',
  referraluserid: '',
  salestaffid: '',
  cskhid: '',
  note: '',
  comment: '',
  medicalhistory: '',
  isbusinessinvoice: false,
  unitname: '',
  unitaddress: '',
  taxcode: '',
  personalname: '',
  personalidentitycard: '',
  personaltaxcode: '',
  personaladdress: '',
  photoUrl: '',
};

export interface FormValidationError {
  readonly field: keyof CustomerFormData;
  readonly message: string;
}

export function validateCustomerForm(data: CustomerFormData): readonly FormValidationError[] {
  const errors: FormValidationError[] = [];

  if (!data.name.trim()) {
    errors.push({ field: 'name', message: 'Vui lòng nhập tên khách hàng' });
  }
  if (!data.phone.trim()) {
    errors.push({ field: 'phone', message: 'Vui lòng nhập số điện thoại' });
  }
  if (!data.companyid) {
    errors.push({ field: 'companyid', message: 'Vui lòng chọn chi nhánh' });
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push({ field: 'email', message: 'Email không hợp lệ' });
  }

  return errors;
}

// Known Vietnamese cities / districts / wards for address cascading
export const VIET_CITIES = [
  'Thành phố Hồ Chí Minh',
  'Thành phố Hà Nội',
  'Tỉnh Bình Dương',
] as const;

export const VIET_DISTRICTS: Record<string, readonly string[]> = {
  'Thành phố Hồ Chí Minh': [
    'Quận 1', 'Quận 3', 'Quận 7', 'Quận 10', 'Quận Gò Vấp',
    'Quận Bình Thạnh', 'Thành phố Thủ Đức',
  ],
  'Thành phố Hà Nội': [
    'Quận Ba Đình', 'Quận Hoàn Kiếm', 'Quận Đống Đa', 'Quận Cầu Giấy',
  ],
  'Tỉnh Bình Dương': [
    'Thành phố Thủ Dầu Một', 'Thành phố Dĩ An', 'Thành phố Thuận An',
  ],
};

export const VIET_WARDS: Record<string, readonly string[]> = {
  'Quận 1': ['Phường Bến Nghé', 'Phường Bến Thành', 'Phường Cầu Kho'],
  'Quận 3': ['Phường 1', 'Phường 2', 'Phường 3'],
  'Quận 7': ['Phường Tân Phú', 'Phường Tân Quy', 'Phường Bình Thuận'],
  'Quận 10': ['Phường 1', 'Phường 4', 'Phường 6'],
  'Quận Gò Vấp': ['Phường 1', 'Phường 3', 'Phường 5'],
};

export const TITLE_OPTIONS = ['Ông', 'Bà', 'Anh', 'Chị', 'Em', 'Bé'] as const;

// Legacy types kept for ReferralCodeInput component compatibility
export interface ReferralCode {
  readonly code: string;
  readonly employeeName: string;
  readonly employeeId: string;
  readonly isActive: boolean;
}

export const MOCK_REFERRAL_CODES: readonly ReferralCode[] = [
  { code: 'DR-MINH-2024', employeeName: 'Dr. Tran Minh', employeeId: 'emp-1', isActive: true },
  { code: 'DR-LINH-2024', employeeName: 'Dr. Nguyen Linh', employeeId: 'emp-2', isActive: true },
  { code: 'REC-HOA-001', employeeName: 'Le Thi Hoa', employeeId: 'emp-3', isActive: true },
  { code: 'DR-KHOA-2024', employeeName: 'Dr. Pham Khoa', employeeId: 'emp-4', isActive: true },
];

export const CUSTOMER_SOURCES = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'google', label: 'Google' },
  { id: 'zalo', label: 'Zalo' },
  { id: 'referral', label: 'Người quen giới thiệu' },
  { id: 'walk-in', label: 'Khách vãng lai' },
  { id: 'website', label: 'Website' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'other', label: 'Khác' },
] as const;
