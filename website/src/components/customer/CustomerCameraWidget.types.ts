import type { CustomerFormData } from '@/types/customer';

export interface CustomerCameraWidgetProps {
  readonly onQuickAddResult: (fields: Partial<CustomerFormData>) => void;
  readonly onFaceIdResult: (
    fields: Partial<CustomerFormData> | null,
    imageBlob?: Blob,
    imageBlobs?: readonly Blob[],
  ) => void;
  readonly disabled?: boolean;
}
