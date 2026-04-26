import { AppointmentFormShell, apiAppointmentToFormData } from '@/components/appointments/unified';
import { PaymentForm } from '@/components/payment/PaymentForm';
import type { ServicePaymentContext } from '@/components/payment/ServicePaymentCard';
import { ServiceForm } from '@/components/services/ServiceForm';
import { DeletePaymentDialog } from './DeletePaymentDialog';
import { DeleteServiceDialog } from './DeleteServiceDialog';
import type {
  ApiAppointment,
  CustomerProfileData,
  CustomerService,
  Employee,
  PaymentFormData,
  ServiceFormPayload,
  ServiceFormUpdatePayload,
} from './types';

interface CustomerProfileModalsProps {
  readonly profile: CustomerProfileData;
  readonly employees?: readonly Employee[];
  readonly showAppointmentModal: boolean;
  readonly editingAppointment: ApiAppointment | null;
  readonly canCreateAppointment: boolean;
  readonly canUpdateAppointment: boolean;
  readonly onCloseAppointment: () => void;
  readonly onAppointmentSuccess: () => Promise<void>;
  readonly showServiceModal: boolean;
  readonly canCreateService: boolean;
  readonly onCloseServiceCreate: () => void;
  readonly onServiceCreate: (data: ServiceFormPayload) => Promise<void>;
  readonly editingService: CustomerService | null;
  readonly onCloseServiceEdit: () => void;
  readonly onServiceUpdate: (data: ServiceFormUpdatePayload) => Promise<void>;
  readonly paymentToDelete: string | null;
  readonly isDeletingPayment: boolean;
  readonly onCancelDeletePayment: () => void;
  readonly onConfirmDeletePayment: () => Promise<void>;
  readonly serviceToDelete: CustomerService | null;
  readonly isDeletingService: boolean;
  readonly onCancelDeleteService: () => void;
  readonly onConfirmDeleteService: () => Promise<void>;
  readonly showPaymentModal: boolean;
  readonly payTargetService: CustomerService | null;
  readonly canMakePayment: boolean;
  readonly onPaymentSubmit: (data: PaymentFormData) => Promise<void>;
  readonly onClosePayment: () => void;
}

export function CustomerProfileModals({
  profile,
  employees,
  showAppointmentModal,
  editingAppointment,
  canCreateAppointment,
  canUpdateAppointment,
  onCloseAppointment,
  onAppointmentSuccess,
  showServiceModal,
  canCreateService,
  onCloseServiceCreate,
  onServiceCreate,
  editingService,
  onCloseServiceEdit,
  onServiceUpdate,
  paymentToDelete,
  isDeletingPayment,
  onCancelDeletePayment,
  onConfirmDeletePayment,
  serviceToDelete,
  isDeletingService,
  onCancelDeleteService,
  onConfirmDeleteService,
  showPaymentModal,
  payTargetService,
  canMakePayment,
  onPaymentSubmit,
  onClosePayment,
}: CustomerProfileModalsProps) {
  const showAppointment = showAppointmentModal && (canCreateAppointment || (editingAppointment && canUpdateAppointment));

  return (
    <>
      {showAppointment && (
        <AppointmentFormShell
          mode={editingAppointment ? 'edit' : 'create'}
          isOpen={showAppointmentModal}
          onClose={onCloseAppointment}
          onSuccess={onAppointmentSuccess}
          initialData={
            editingAppointment
              ? apiAppointmentToFormData(editingAppointment)
              : { customerId: profile.id, customerName: profile.name, customerPhone: profile.phone, locationId: profile.companyId }
          }
          customerReadOnly
          employees={employees}
        />
      )}

      {showServiceModal && canCreateService && (
        <ServiceForm
          customerId={profile.id}
          initialData={{ customerId: profile.id, customerName: profile.name, locationId: profile.companyId }}
          onSubmit={onServiceCreate}
          onClose={onCloseServiceCreate}
        />
      )}

      {editingService && (
        <ServiceForm
          customerId={profile.id}
          isEdit
          initialData={{
            id: editingService.orderId || editingService.id,
            customerId: profile.id,
            customerName: profile.name,
            catalogItemId: editingService.catalogItemId,
            serviceName: editingService.service,
            doctorId: editingService.doctorId,
            assistantId: editingService.assistantId,
            dentalAideId: editingService.dentalAideId,
            sourceId: editingService.sourceId,
            locationId: editingService.locationId || profile.companyId,
            startDate: editingService.date,
            notes: editingService.notes || '',
            totalCost: editingService.cost,
            quantity: editingService.quantity,
            unit: editingService.unit,
            toothNumbers: editingService.tooth ? editingService.tooth.split(',').map((t) => t.trim()).filter(Boolean) : [],
          }}
          onSubmit={onServiceUpdate}
          onClose={onCloseServiceEdit}
        />
      )}

      <DeletePaymentDialog
        paymentToDelete={paymentToDelete}
        isDeleting={isDeletingPayment}
        onCancel={onCancelDeletePayment}
        onConfirm={onConfirmDeletePayment}
      />

      <DeleteServiceDialog
        service={serviceToDelete}
        isDeleting={isDeletingService}
        onCancel={onCancelDeleteService}
        onConfirm={onConfirmDeleteService}
      />

      {showPaymentModal && canMakePayment && payTargetService && (
        <PaymentForm
          defaultCustomerName={profile.name}
          defaultCustomerId={profile.id}
          depositBalance={profile.depositBalance}
          outstandingBalance={profile.outstandingBalance}
          serviceContext={toPaymentContext(payTargetService, profile)}
          onSubmit={onPaymentSubmit}
          onClose={onClosePayment}
        />
      )}
    </>
  );
}

function toPaymentContext(service: CustomerService, profile: CustomerProfileData): ServicePaymentContext {
  return {
    recordId: service.orderId || service.id,
    recordName: service.orderCode || service.orderName || service.service,
    recordType: 'saleorder',
    totalCost: service.cost,
    paidAmount: service.paidAmount ?? Math.max(0, service.cost - (service.residual ?? service.cost)),
    residual: service.residual ?? service.cost,
    locationName: service.locationName ?? profile.companyName ?? '',
    orderName: service.orderName,
  };
}
