/**
 * @crossref:domain[customers-partners]
 * @crossref:used-in[create/edit form actions composed by website/src/pages/Customers/useCustomerDetailController.ts; powers AddCustomerForm submit in website/src/pages/Customers.tsx]
 * @crossref:uses[website/src/lib/api.ts (registerFace post-create), website/src/lib/api/partners.ts (ApiPartner shape), website/src/hooks/useTrackedForm.ts (submit telemetry/toast), website/src/data/mockCustomerForm.ts (CustomerFormData), product-map/domains/customers-partners.yaml]
 */
/**
 * Form submission and edit-data preparation for the AddCustomerForm
 * @crossref:used-in[Customers]
 */
import { useCallback, useState } from 'react';
import { registerFace } from '@/lib/api';
import type { CapturedFaceImages } from '@/components/shared/faceCaptureProfile';
import type { ApiPartner } from '@/lib/api/partners';
import type { CustomerFormData } from '@/data/mockCustomerForm';
import type { CustomerProfileData } from '@/hooks/useCustomerProfile';
import type { Customer } from '@/hooks/useCustomers';
import { useTrackedForm } from '@/hooks/useTrackedForm';

interface UseCustomerFormActionsOptions {
  readonly isEditMode: boolean;
  readonly selectedCustomerId: string | null;
  readonly rawPartner: ApiPartner | null;
  readonly hookProfile: CustomerProfileData | null;
  readonly customers: readonly Customer[];
  readonly createCustomer: (data: CustomerFormData) => Promise<Customer>;
  readonly updateCustomer: (id: string, data: CustomerFormData) => Promise<void>;
  readonly refetchProfile: () => void | Promise<void>;
  readonly setShowForm: (v: boolean) => void;
  readonly setIsEditMode: (v: boolean) => void;
}

export function useCustomerFormActions({
  isEditMode,
  selectedCustomerId,
  rawPartner,
  hookProfile,
  customers,
  createCustomer,
  updateCustomer,
  refetchProfile,
  setShowForm,
  setIsEditMode,
}: UseCustomerFormActionsOptions) {
  const [createdCustomerCode, setCreatedCustomerCode] = useState<string | null>(null);
  const [pendingFaceImages, setPendingFaceImages] = useState<readonly Blob[]>([]);
  const pendingFaceImage = pendingFaceImages[0] ?? null;
  const setPendingFaceImage = useCallback((image: CapturedFaceImages) => {
    if (!image) {
      setPendingFaceImages([]);
      return;
    }
    setPendingFaceImages(Array.isArray(image) ? image : [image]);
  }, []);

  const getCustomerCode = useCallback((): string | null | undefined => {
    if (!selectedCustomerId) return undefined;
    if (rawPartner?.code) return rawPartner.code;
    if (hookProfile?.code) return hookProfile.code;
    return customers.find((c) => c.id === selectedCustomerId)?.code;
  }, [selectedCustomerId, rawPartner, hookProfile, customers]);

  const getEditFormData = useCallback((): Partial<CustomerFormData> | undefined => {
    if (!isEditMode || !selectedCustomerId) return undefined;

    // Prefer raw partner data (has all fields) over summarised profile
    if (rawPartner) {
      const g = rawPartner.gender ?? '';
      return {
        name: rawPartner.name ?? '',
        phone: rawPartner.phone ?? '',
        email: rawPartner.email ?? '',
        gender:
          g === 'female' || g === 'Nữ' || g === 'f'
            ? 'female'
            : g
              ? 'male'
              : '',
        companyid: rawPartner.companyid ?? '',
        street: rawPartner.street ?? '',
        cityname: rawPartner.city ?? '',
        districtname: rawPartner.district ?? '',
        wardname: rawPartner.ward ?? '',
        note: rawPartner.note ?? '',
        comment: rawPartner.comment ?? '',
        medicalhistory: rawPartner.medicalhistory ?? '',
        birthday: rawPartner.birthday ?? null,
        birthmonth: rawPartner.birthmonth ?? null,
        birthyear: rawPartner.birthyear ?? null,
        sourceid: rawPartner.sourceid ?? '',
        referraluserid: rawPartner.referraluserid ?? '',
        salestaffid: rawPartner.salestaffid ?? '',
        cskhid: rawPartner.cskhid ?? '',
        weight: rawPartner.weight ?? null,
        identitynumber: rawPartner.identitynumber ?? '',
        healthinsurancecardnumber: rawPartner.healthinsurancecardnumber ?? '',
        emergencyphone: rawPartner.emergencyphone ?? '',
        jobtitle: rawPartner.jobtitle ?? '',
        taxcode: rawPartner.taxcode ?? '',
        unitname: rawPartner.unitname ?? '',
        unitaddress: rawPartner.unitaddress ?? '',
        isbusinessinvoice: rawPartner.isbusinessinvoice ?? false,
        personalname: rawPartner.personalname ?? '',
        personalidentitycard: rawPartner.personalidentitycard ?? '',
        personaltaxcode: rawPartner.personaltaxcode ?? '',
        personaladdress: rawPartner.personaladdress ?? '',
        ref: rawPartner.code ?? '',
      };
    }

    // Fallback to summarised profile
    if (hookProfile) {
      return {
        name: hookProfile.name,
        phone: hookProfile.phone,
        email: hookProfile.email,
        gender:
          hookProfile.gender === 'female' ||
          hookProfile.gender === 'Nữ' ||
          hookProfile.gender === 'f'
            ? 'female'
            : hookProfile.gender && hookProfile.gender !== 'N/A'
              ? 'male'
              : '',
        companyid: hookProfile.companyId,
        street:
          hookProfile.address !== 'N/A'
            ? hookProfile.address.split(', ')[0] || ''
            : '',
        note: hookProfile.notes || '',
        comment: '',
        medicalhistory: hookProfile.medicalHistory || '',
        sourceid: hookProfile.sourceid || '',
        referraluserid: hookProfile.referraluserid || '',
        salestaffid: hookProfile.salestaffid || '',
        cskhid: hookProfile.cskhid || '',
        ref: hookProfile.code || '',
      };
    }

    // Fallback to paginated customers list
    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) return undefined;
    return {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      gender:
        customer.gender === 'female' ||
        customer.gender === 'Nữ' ||
        customer.gender === 'f'
          ? 'female'
          : customer.gender
            ? 'male'
            : '',
      companyid: customer.locationId,
      street: customer.street || '',
      note: customer.note || '',
      comment: customer.comment || '',
      sourceid: customer.sourceid || '',
      referraluserid: '',
      salestaffid: customer.salestaffid || '',
      cskhid: customer.cskhid || '',
      ref: customer.code || '',
    };
  }, [isEditMode, selectedCustomerId, rawPartner, hookProfile, customers]);
  const { isSubmitting: isTrackedSubmitting, toast, submit: trackedSubmit, dismissToast } = useTrackedForm<Customer | void>();
  const handleSubmit = useCallback(
    async (data: CustomerFormData) => {
      const action = isEditMode ? 'updateCustomer' : 'createCustomer';
      await trackedSubmit(
        async () => {
          if (isEditMode && selectedCustomerId) {
            await updateCustomer(selectedCustomerId, data);
            await refetchProfile();
            setShowForm(false);
            setIsEditMode(false);
          } else {
            const created = await createCustomer(data);
            if (pendingFaceImages.length > 0) {
              try {
                for (const image of pendingFaceImages) {
                  await registerFace(created.id, image, 'profile_register');
                }
              } catch (err) {
                console.error('Post-save face registration failed:', err);
              }
              setPendingFaceImages([]);
            }
            setCreatedCustomerCode(created.code ?? null);
            setShowForm(false);
            setIsEditMode(false);
            return created;
          }
        },
        {
          module: 'Customers',
          action,
          formState: { name: data.name, phone: data.phone, email: data.email },
        }
      );
    },
    [
      isEditMode,
      selectedCustomerId,
      createCustomer,
      updateCustomer,
      refetchProfile,
      setShowForm,
      setIsEditMode,
      pendingFaceImages,
      trackedSubmit,
    ],
  );

  return {
    createdCustomerCode,
    pendingFaceImage,
    setPendingFaceImage,
    setCreatedCustomerCode,
    getCustomerCode,
    getEditFormData,
    handleSubmit,
    toast,
    dismissToast,
    isTrackedSubmitting,
  };
}
