/**
 * Customer Form types re-exported from /types/
 * @crossref:used-in[AddCustomerForm, Customers]
 */

import type { CustomerFormData, FormValidationError } from '@/types/customer';
import type { CustomerSource } from '@/types/settings';

export type { CustomerFormData, FormValidationError, CustomerSource };

// Referral codes interface
export interface ReferralCode {
  readonly code: string;
  readonly employeeName: string;
  readonly employeeId: string;
  readonly isActive: boolean;
}

// Empty form
export const EMPTY_CUSTOMER_FORM: CustomerFormData = {
  ref: '',
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
  photoUrl: '',
  personalname: '',
  personalidentitycard: '',
  personaltaxcode: '',
  personaladdress: '',
};

// Vietnamese cities
export const VIET_CITIES = [
  'Hồ Chí Minh',
  'Thành phố Hồ Chí Minh',
  'Hà Nội',
  'Thành phố Hà Nội',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'Khánh Hòa',
  'Bình Dương',
  'Tỉnh Bình Dương',
  'Đồng Nai',
  'Bà Rịa - Vũng Tàu',
  'Lâm Đồng',
] as const;

// Complete districts for all Vietnamese cities
// Hồ Chí Minh districts
export const HO_CHI_MINH_DISTRICTS = [
  'Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8', 'Quận 10', 'Quận 11', 'Quận 12',
  'Quận Bình Tân', 'Quận Bình Thạnh', 'Quận Gò Vấp', 'Quận Phú Nhuận', 'Quận Tân Bình', 'Quận Tân Phú',
  'Thành phố Thủ Đức', 'Quận Thủ Đức'
];

// Hà Nội districts
export const HA_NOI_DISTRICTS = [
  'Quận Ba Đình', 'Quận Hoàn Kiếm', 'Quận Đống Đa', 'Quận Hai Bà Trưng', 'Quận Thanh Xuân',
  'Quận Cầu Giấy', 'Quận Gia Lâm', 'Quận Đông Anh', 'Quận Long Biên', 'Quận Nam Từ Liêm',
  'Quận Bắc Từ Liêm', 'Quận Tây Hồ', 'Huyện Thanh Trì', 'Huyện Hoài Đức', 'Huyện Thường Tín'
];

// Đà Nẵng districts
export const DA_NANG_DISTRICTS = [
  'Quận Hải Châu', 'Quận Thanh Khê', 'Quận Sơn Trà', 'Quận Ngũ Hành Sơn', 'Quận Liên Chiểu',
  'Huyện Hòa Vang', 'Huyện Hoà Sa Điền'
];

export const VIET_DISTRICTS: Record<string, readonly string[]> = {
  'Hồ Chí Minh': HO_CHI_MINH_DISTRICTS,
  'Thành phố Hồ Chí Minh': HO_CHI_MINH_DISTRICTS,
  'Hà Nội': HA_NOI_DISTRICTS,
  'Thành phố Hà Nội': HA_NOI_DISTRICTS,
  'Đà Nẵng': DA_NANG_DISTRICTS,
  'Hải Phòng': ['Quận Hồng Bàng', 'Quận Lê Chân', 'Quận Ngô Quyền', 'Quận Kiến An', 'Quận Đồ Sơn', 'Quận Dương Kinh', 'Huyện An Dương', 'Huyện Tiên Lãng'],
  'Cần Thơ': ['Quận Ninh Kiều', 'Quận Bình Thủy', 'Quận Cái Răng', 'Quận Thốt Nốt', 'Huyện Vĩnh Thạnh', 'Huyện Cờ Đỏ', 'Huyện Phong Điền'],
  'Khánh Hòa': ['Thành phố Nha Trang', 'Thành phố Cam Ranh', 'Huyện Diên Khánh', 'Huyện Ninh Hòa', 'Huyện Khánh Vĩnh'],
  'Bình Dương': ['Thành phố Thủ Dầu Một', 'Thành phố Dĩ An', 'Thành phố Thuận An', 'Huyện Bắc Tân Uyên', 'Huyện Phú Giáo', 'Huyện Dầu Tiếng'],
  'Tỉnh Bình Dương': ['Thành phố Thủ Dầu Một', 'Thành phố Dĩ An', 'Thành phố Thuận An', 'Huyện Bắc Tân Uyên', 'Huyện Phú Giáo', 'Huyện Dầu Tiếng'],
  'Đồng Nai': ['Thành phố Biên Hòa', 'Thành phố Long Khánh', 'Huyện Trảng Bom', 'Huyện Thống Nhất', 'Huyện Cẩm Mỹ', 'Huyện Long Thành'],
  'Bà Rịa - Vũng Tàu': ['Thành phố Vũng Tàu', 'Thành phố Bà Rịa', 'Huyện Châu Đức', 'Huyện Xuyên Mộc', 'Huyện Côn Đảo'],
  'Lâm Đồng': ['Thành phố Đà Lạt', 'Thành phố Bảo Lộc', 'Huyện Đức Trọng', 'Huyện Di Linh', 'Huyện Bảo Lâm'],
};

// Sample wards for a few districts (for demo - in production this would be comprehensive)
export const VIET_WARDS: Record<string, readonly string[]> = {
  // Quận 1 wards
  'Quận 1': ['Phường Bến Nghé', 'Phường Bến Thành', 'Phường Cầu Kho', 'Phường Cầu Ông Lãnh', 'Phường Đa Kao', 'Phường Tân Định'],
  // Quận 3 wards
  'Quận 3': ['Phường Võ Thị Sáu', 'Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5'],
  // Quận 7 wards
  'Quận 7': ['Phường Tân Thuận Đông', 'Phường Tân Thuận Tây', 'Phường Bình Thuận', 'Phường Phú Mỹ', 'Phường Phú Thuận'],
};

export const TITLE_OPTIONS = ['Ông', 'Bà', 'Anh', 'Chị'] as const;

export const MOCK_REFERRAL_CODES: readonly ReferralCode[] = [];

export const CUSTOMER_SOURCES = [
  { id: 'sales-staff', label: 'Nhân viên sale' },
  { id: 'walk-in', label: 'Khách vãng lai' },
] as const;

export function validateCustomerForm(data: CustomerFormData): FormValidationError[] {
  const errors: FormValidationError[] = [];
  if (!data.name.trim()) errors.push({ field: 'name', message: 'Vui lòng nhập tên' });
  if (!data.phone.trim()) errors.push({ field: 'phone', message: 'Vui lòng nhập sđt' });
  return errors;
}
