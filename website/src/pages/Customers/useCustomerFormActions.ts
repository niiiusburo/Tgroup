/**
 * Form submission and edit-data preparation for the AddCustomerForm
 * @crossref:used-in[Customers]
 */
import { useCallback, useState } from 'react';
import { registerFace } from '@/lib/api';
import type { ApiPartner } from '@/lib/api/partners';
import type { CustomerFormData } from '@/data/mockCustomerForm';
import type { CustomerProfileData } from '@/hooks/useCustomerProfile';
import type { Customer } from '@/hooks/useCustomers';

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
  const [pendingFaceImage, setPendingFaceImage] = useState<Blob | null>(null);

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

  const handleSubmit = useCallback(
    async (data: CustomerFormData) => {
      if (isEditMode && selectedCustomerId) {
        await updateCustomer(selectedCustomerId, data);
        await refetchProfile();
        setShowForm(false);
        setIsEditMode(false);
      } else {
        const created = await createCustomer(data);
        if (pendingFaceImage) {
          try {
            await registerFace(created.id, pendingFaceImage);
          } catch (err) {
            console.error('Post-save face registration failed:', err);
          }
          setPendingFaceImage(null);
        }
        setCreatedCustomerCode(created.code ?? null);
        setShowForm(false);
        setIsEditMode(false);
      }
    },
    [
      isEditMode,
      selectedCustomerId,
      createCustomer,
      updateCustomer,
      refetchProfile,
      setShowForm,
      setIsEditMode,
      pendingFaceImage,
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
  };
}
