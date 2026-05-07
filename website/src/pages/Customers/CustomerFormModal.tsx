import { AddCustomerForm } from '@/components/forms/AddCustomerForm';
import type { CapturedFaceImages } from '@/components/shared/faceCaptureProfile';
import type { CustomerFormData } from '@/data/mockCustomerForm';

interface CustomerFormModalProps {
  readonly showForm: boolean;
  readonly isEditMode: boolean;
  readonly canEditCustomers: boolean;
  readonly initialData?: Partial<CustomerFormData>;
  readonly customerRef?: string | null;
  readonly customerId?: string;
  readonly onSubmit: (data: CustomerFormData) => Promise<void>;
  readonly onCancel: () => void;
  readonly onPendingFaceImage: (image: CapturedFaceImages) => void;
}

export function CustomerFormModal({
  showForm,
  isEditMode,
  canEditCustomers,
  initialData,
  customerRef,
  customerId,
  onSubmit,
  onCancel,
  onPendingFaceImage,
}: CustomerFormModalProps) {
  if (!showForm) return null;

  return (
    <AddCustomerForm
      isEdit={isEditMode}
      canEdit={canEditCustomers}
      initialData={initialData}
      customerRef={customerRef ?? undefined}
      customerId={customerId}
      onSubmit={onSubmit}
      onCancel={onCancel}
      onPendingFaceImage={onPendingFaceImage}
    />
  );
}
