import type { CustomerProfileData } from '@/hooks/useCustomerProfile';
import type { CustomerService } from '@/types/customer';
import type { Employee } from '@/data/mockEmployees';
import type { ApiAppointment, ExternalCheckupsResponse } from '@/lib/api';
import type { DepositTransaction, DepositBalance } from '@/hooks/useDeposits';
import type { PaymentWithAllocations } from '@/hooks/useCustomerPayments';

export type CustomerProfileTab = 'profile' | 'appointments' | 'records' | 'payment';

export interface ServiceFormPayload {
  catalogItemId: string;
  serviceName: string;
  category?: string;
  doctorId: string | null;
  doctorName: string;
  assistantId?: string | null;
  assistantName?: string;
  dentalAideId?: string | null;
  dentalAideName?: string;
  locationId: string;
  locationName: string;
  totalVisits?: number;
  totalCost: number;
  startDate: string;
  expectedEndDate?: string;
  notes: string;
  quantity?: number;
  unit?: string;
  toothNumbers: readonly string[];
  toothComment?: string;
  sourceId?: string | null;
}

export interface ServiceUpdatePayload extends ServiceFormPayload {
  id: string;
}

export type ServiceFormUpdatePayload = ServiceFormPayload & { id?: string };
export type PaymentFormData = import('@/components/payment/PaymentForm').PaymentFormData;

export interface ProfileTabProps {
  profile: CustomerProfileData;
  checkupData: ExternalCheckupsResponse | null;
  checkupsLoading: boolean;
  checkupsError: string | null;
  onRefetchCheckups?: () => void;
  canViewHealthCheckups: boolean;
}

export interface RecordsTabProps {
  profile: CustomerProfileData;
  services: readonly CustomerService[];
  loadingServices: boolean;
  payments: readonly PaymentWithAllocations[];
  onCreateService: () => void;
  onEditService: (service: CustomerService) => void;
  onDeleteService?: (service: CustomerService) => void;
  onPayForService: (service: CustomerService) => void;
  onDeletePayment: (id: string) => void;
  onUpdateServiceStatus: (serviceId: string, status: string) => Promise<void>;
}

export interface PaymentTabProps {
  profile: CustomerProfileData;
  services: readonly CustomerService[];
  payments: readonly PaymentWithAllocations[];
  loadingPayments: boolean;
  depositList: readonly DepositTransaction[];
  usageHistory: readonly DepositTransaction[];
  depositBalance: DepositBalance;
  onAddDeposit?: (amount: number, method: 'cash' | 'bank_transfer' | 'vietqr', date?: string, note?: string) => Promise<void>;
  onAddRefund?: (amount: number, method: 'cash' | 'bank_transfer', date?: string, note?: string) => Promise<void>;
  onVoidDeposit: (id: string) => Promise<void>;
  onDeleteDeposit: (id: string) => Promise<void>;
  onEditDeposit: (id: string, data: Partial<{ amount: number; method: 'cash' | 'bank_transfer'; notes: string; paymentDate: string }>) => Promise<void>;
  onRefreshDeposits?: () => void;
  onDeletePayment: (id: string) => void;
}

export interface OrchestratorProps {
  profile: CustomerProfileData;
  appointments: readonly ApiAppointment[];
  services?: readonly CustomerService[];
  loadingServices?: boolean;
  employees?: readonly Employee[];
  depositList?: DepositTransaction[];
  usageHistory?: DepositTransaction[];
  depositBalance?: DepositBalance;
  payments?: PaymentWithAllocations[];
  activeTab?: CustomerProfileTab;
  onTabChange?: (tab: CustomerProfileTab) => void;
  onBack: () => void;
  onEdit?: () => void;
  onAddDeposit?: (customerId: string, amount: number, method: 'cash' | 'bank_transfer' | 'vietqr', date?: string, note?: string) => Promise<void>;
  onAddRefund?: (customerId: string, amount: number, method: 'cash' | 'bank_transfer', date?: string, note?: string) => Promise<void>;
  onVoidDeposit?: (id: string) => Promise<void>;
  onDeleteDeposit?: (id: string) => Promise<void>;
  onEditDeposit?: (id: string, data: Partial<{ amount: number; method: 'cash' | 'bank_transfer'; notes: string; paymentDate: string }>) => Promise<void>;
  onRefreshDeposits?: () => void;
  onCreateAppointment?: () => void | Promise<void>;
  onUpdateAppointment?: () => void | Promise<void>;
  onCreateService?: (data: ServiceFormPayload) => Promise<void>;
  onUpdateService?: (data: ServiceUpdatePayload) => Promise<void>;
  onDeleteService?: (serviceId: string) => Promise<void>;
  onMakePayment?: (data: PaymentFormData) => Promise<void>;
  onDeletePayment?: (id: string) => Promise<void>;
  onSoftDelete?: () => void;
  onHardDelete?: () => void;
  canSoftDelete?: boolean;
  canHardDelete?: boolean;
  loadingDeposits?: boolean;
  loadingPayments?: boolean;
  checkupData?: ExternalCheckupsResponse | null;
  checkupsLoading?: boolean;
  checkupsError?: string | null;
  onRefetchCheckups?: () => void;
  onUpdateServiceStatus?: (serviceId: string, newStatus: string) => Promise<void>;
}

// Re-export for convenience
export type { CustomerProfileData, CustomerService, Employee, ApiAppointment, ExternalCheckupsResponse, DepositTransaction, DepositBalance, PaymentWithAllocations };
