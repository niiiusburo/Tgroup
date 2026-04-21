/**
 * Customer-related type definitions
 * @crossref:used-in[CustomerSelector, CustomerForm, AppointmentForm, useCustomers]
 */

export type CustomerStatus = 'active' | 'inactive' | 'pending';

export interface Customer {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly locationId: string;
  readonly status: CustomerStatus;
  readonly lastVisit: string;
}

// Customer Form Types
export interface CustomerFormData {
  // Core
  ref: string;  // Customer code / mã khách hàng
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

  // Additional fields
  photoUrl: string;
  personalname: string;
  personalidentitycard: string;
  personaltaxcode: string;
  personaladdress: string;
}

export interface FormValidationError {
  readonly field: string;
  readonly message: string;
}

// Customer Profile Types
export interface CustomerPhoto {
  readonly id: string;
  readonly url: string;
  readonly label: string;
  readonly date: string;
  readonly type: 'before' | 'after';
  readonly treatmentId: string;
}

export interface DepositTransaction {
  readonly id: string;
  readonly date: string;
  readonly amount: number;
  readonly type: 'topup' | 'payment';
  readonly description: string;
}

export interface CustomerDeposit {
  readonly id: string;
  readonly customerId: string;
  readonly balance: number;
  readonly lastTopUp: string;
  readonly transactions: readonly DepositTransaction[];
}

export interface CustomerAppointment {
  readonly id: string;
  readonly date: string;
  readonly time: string;
  readonly doctor: string;
  readonly service: string;
  readonly status: 'completed' | 'cancelled' | 'no-show';
  readonly location: string;
  readonly notes: string;
  readonly assistant?: string;
  readonly dentalAide?: string;
}

export interface CustomerService {
  readonly id: string;
  readonly date: string;
  readonly service: string;
  readonly doctor: string;
  readonly doctorId?: string;
  readonly assistantId?: string | null;
  readonly assistantName?: string;
  readonly dentalAideId?: string | null;
  readonly dentalAideName?: string;
  readonly catalogItemId?: string;
  readonly cost: number;
  readonly quantity?: number;
  readonly unit?: string;
  readonly status: 'completed' | 'active' | 'cancelled';
  readonly tooth: string;
  readonly notes: string;
  readonly orderName?: string;
  readonly orderCode?: string;
  readonly paidAmount?: number;
  readonly residual?: number;
  readonly sourceId?: string | null;
  /** Branch/clinic name where the service was performed. */
  readonly locationName?: string;
}
