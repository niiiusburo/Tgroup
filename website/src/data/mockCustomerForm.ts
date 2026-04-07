/**
 * Mock data for Customer Forms - sources, referral codes, and form types
 * @crossref:used-in[AddCustomerForm, CustomerSourceDropdown, ReferralCodeInput]
 */

export interface CustomerSource {
  readonly id: string;
  readonly label: string;
}

export interface ReferralCode {
  readonly code: string;
  readonly employeeName: string;
  readonly employeeId: string;
  readonly isActive: boolean;
}

export interface CustomerFormData {
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string;
  readonly email: string;
  readonly dateOfBirth: string;
  readonly gender: 'male' | 'female' | 'other' | '';
  readonly locationId: string;
  readonly sourceId: string;
  readonly referralCode: string;
  readonly notes: string;
  readonly photoUrl: string;
  readonly address: string;
}

export const EMPTY_CUSTOMER_FORM: CustomerFormData = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  dateOfBirth: '',
  gender: '',
  locationId: '',
  sourceId: '',
  referralCode: '',
  notes: '',
  photoUrl: '',
  address: '',
};

export const CUSTOMER_SOURCES: readonly CustomerSource[] = [
  { id: 'walk-in', label: 'Walk-in' },
  { id: 'referral', label: 'Referral' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'google', label: 'Google Search' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'zalo', label: 'Zalo' },
  { id: 'website', label: 'Website' },
  { id: 'returning', label: 'Returning Customer' },
  { id: 'other', label: 'Other' },
];

export const MOCK_REFERRAL_CODES: readonly ReferralCode[] = [
  { code: 'DR-MINH-2024', employeeName: 'Dr. Tran Minh', employeeId: 'emp-1', isActive: true },
  { code: 'DR-LINH-2024', employeeName: 'Dr. Nguyen Linh', employeeId: 'emp-2', isActive: true },
  { code: 'REC-HOA-001', employeeName: 'Le Thi Hoa', employeeId: 'emp-3', isActive: true },
  { code: 'DR-KHOA-2024', employeeName: 'Dr. Pham Khoa', employeeId: 'emp-4', isActive: true },
  { code: 'REC-MAI-001', employeeName: 'Vo Mai', employeeId: 'emp-5', isActive: false },
];

export interface FormValidationError {
  readonly field: keyof CustomerFormData;
  readonly message: string;
}

export function validateCustomerForm(data: CustomerFormData): readonly FormValidationError[] {
  const errors: FormValidationError[] = [];

  if (!data.firstName.trim()) {
    errors.push({ field: 'firstName', message: 'First name is required' });
  }
  if (!data.lastName.trim()) {
    errors.push({ field: 'lastName', message: 'Last name is required' });
  }
  if (!data.phone.trim()) {
    errors.push({ field: 'phone', message: 'Phone number is required' });
  } else if (!/^0\d{2,3}[-\s]?\d{3}[-\s]?\d{3,4}$/.test(data.phone.trim())) {
    errors.push({ field: 'phone', message: 'Invalid Vietnamese phone format (e.g. 0901-111-222)' });
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push({ field: 'email', message: 'Invalid email address' });
  }
  if (!data.locationId) {
    errors.push({ field: 'locationId', message: 'Please select a location' });
  }

  return errors;
}
