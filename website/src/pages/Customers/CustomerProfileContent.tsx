import { CustomerProfile } from '@/components/customer';
import type { CustomerProfileData } from '@/hooks/useCustomerProfile';
import type { CustomerProfileProps, ProfileTab } from '@/components/customer/CustomerProfile';
import type { CustomerService } from '@/types/customer';

type DeleteDialogState = {
  open: boolean;
  customerId: string | null;
  customerName: string;
  mode: 'soft' | 'hard';
};

interface CustomerProfileContentProps
  extends Omit<CustomerProfileProps, 'services' | 'activeTab' | 'onTabChange' | 'onBack' | 'onEdit' | 'onSoftDelete' | 'onHardDelete' | 'onDeletePayment' | 'onUpdateServiceStatus'> {
  readonly hookProfile: CustomerProfileData | null;
  readonly services: CustomerService[];
  readonly activeTab: ProfileTab;
  readonly onTabChange: (tab: ProfileTab) => void;
  readonly onBack: () => void;
  readonly canEditCustomers: boolean;
  readonly openEditForm: () => void;
  readonly selectedCustomerId: string | null;
  readonly setDeleteDialog: (dialog: DeleteDialogState | null) => void;
  readonly deletePaymentById: (id: string) => Promise<void>;
  readonly refetchPayments: () => void | Promise<void>;
  readonly refetchProfile: () => void | Promise<void>;
  readonly loadSaleOrderLines: () => void | Promise<void>;
  readonly updateServiceStatus: (serviceId: string, status: 'active' | 'completed' | 'cancelled') => Promise<unknown>;
}

export function CustomerProfileContent({
  hookProfile,
  services,
  activeTab,
  onTabChange,
  onBack,
  canEditCustomers,
  openEditForm,
  selectedCustomerId,
  setDeleteDialog,
  deletePaymentById,
  refetchPayments,
  refetchProfile,
  loadSaleOrderLines,
  updateServiceStatus,
  ...profileProps
}: CustomerProfileContentProps) {
  const openDelete = (mode: 'soft' | 'hard') => {
    if (!selectedCustomerId || !hookProfile) return;
    setDeleteDialog({
      open: true,
      customerId: selectedCustomerId,
      customerName: hookProfile.name,
      mode,
    });
  };

  return (
    <CustomerProfile
      {...profileProps}
      services={services}
      activeTab={activeTab}
      onTabChange={onTabChange}
      onBack={onBack}
      onEdit={canEditCustomers ? openEditForm : undefined}
      onDeletePayment={async (id) => {
        await deletePaymentById(id);
        await Promise.all([refetchPayments(), refetchProfile(), loadSaleOrderLines()]);
      }}
      onSoftDelete={() => openDelete('soft')}
      onHardDelete={() => openDelete('hard')}
      onUpdateServiceStatus={async (serviceId, newStatus) => {
        await updateServiceStatus(serviceId, newStatus as 'active' | 'completed' | 'cancelled');
      }}
    />
  );
}
