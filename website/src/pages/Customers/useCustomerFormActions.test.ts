import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCustomerFormActions } from './useCustomerFormActions';
import type { CustomerProfileData } from '@/hooks/useCustomerProfile';

vi.mock('@/lib/api', () => ({
  registerFace: vi.fn(),
}));

const baseProfile: CustomerProfileData = {
  id: 'customer-1',
  name: 'Customer One',
  phone: '0909000000',
  email: '',
  gender: 'N/A',
  dateOfBirth: 'N/A',
  address: 'N/A',
  notes: '',
  medicalHistory: '',
  tags: [],
  memberSince: 'N/A',
  totalVisits: 0,
  lastVisit: 'N/A',
  totalSpent: 0,
  companyId: 'loc-1',
  companyName: 'Location',
  code: 'T0001',
  depositBalance: 0,
  outstandingBalance: 0,
  salestaffid: null,
  salestaffLabel: null,
  cskhid: null,
  cskhname: null,
  referraluserid: null,
  sourceid: null,
  sourcename: null,
};

const renderFormActions = (overrides: Partial<Parameters<typeof useCustomerFormActions>[0]>) =>
  renderHook(() =>
    useCustomerFormActions({
      isEditMode: true,
      selectedCustomerId: 'customer-1',
      rawPartner: null,
      hookProfile: null,
      customers: [],
      createCustomer: vi.fn(),
      updateCustomer: vi.fn(),
      refetchProfile: vi.fn(),
      setShowForm: vi.fn(),
      setIsEditMode: vi.fn(),
      ...overrides,
    }),
  );

describe('useCustomerFormActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves profile assignment IDs when edit form falls back to hook profile data', () => {
    const { result } = renderFormActions({
      hookProfile: {
        ...baseProfile,
        referraluserid: 'referrer-1',
        salestaffid: 'sales-1',
        cskhid: 'cskh-1',
        sourceid: 'source-1',
      },
    });

    expect(result.current.getEditFormData()).toMatchObject({
      referraluserid: 'referrer-1',
      salestaffid: 'sales-1',
      cskhid: 'cskh-1',
      sourceid: 'source-1',
    });
  });

  it('preserves list sales assignment when edit form falls back to customer rows', () => {
    const { result } = renderFormActions({
      customers: [
        {
          id: 'customer-1',
          name: 'Customer One',
          phone: '0909000000',
          email: '',
          locationId: 'loc-1',
          status: 'active',
          lastVisit: '',
          salestaffid: 'sales-1',
          cskhid: 'cskh-1',
        },
      ],
    });

    expect(result.current.getEditFormData()).toMatchObject({
      salestaffid: 'sales-1',
      cskhid: 'cskh-1',
    });
  });

  describe('face registration on create', () => {
    it('registers face after creating customer when pendingFaceImage is set', async () => {
      const { registerFace } = await import('@/lib/api');
      vi.mocked(registerFace).mockResolvedValue({
        success: true,
        partnerId: 'new-customer',
        sampleId: 's-1',
        sampleCount: 1,
        faceRegisteredAt: '2026-05-07T10:00:00',
      });

      const createCustomer = vi.fn().mockResolvedValue({
        id: 'new-customer',
        code: 'T9999',
        name: 'New Customer',
      });

      const { result } = renderFormActions({
        isEditMode: false,
        selectedCustomerId: null,
        createCustomer,
      });

      const fakeBlob = new Blob(['face-image'], { type: 'image/jpeg' });
      act(() => {
        result.current.setPendingFaceImage(fakeBlob);
      });

      await result.current.handleSubmit({
        name: 'New Customer',
        phone: '0909999999',
      } as unknown as Parameters<typeof result.current.handleSubmit>[0]);

      await waitFor(() => {
        expect(createCustomer).toHaveBeenCalled();
      });
      expect(registerFace).toHaveBeenCalledWith('new-customer', fakeBlob, 'profile_register');
    });

    it('does not call registerFace when no pendingFaceImage', async () => {
      const { registerFace } = await import('@/lib/api');
      const createCustomer = vi.fn().mockResolvedValue({
        id: 'new-customer',
        code: 'T9999',
        name: 'New Customer',
      });

      const { result } = renderFormActions({
        isEditMode: false,
        selectedCustomerId: null,
        createCustomer,
      });

      await result.current.handleSubmit({
        name: 'New Customer',
        phone: '0909999999',
      } as unknown as Parameters<typeof result.current.handleSubmit>[0]);

      expect(createCustomer).toHaveBeenCalled();
      expect(registerFace).not.toHaveBeenCalled();
    });

    it('does not block customer creation if face registration fails', async () => {
      const { registerFace } = await import('@/lib/api');
      vi.mocked(registerFace).mockRejectedValue(new Error('Face service down'));

      const createCustomer = vi.fn().mockResolvedValue({
        id: 'new-customer',
        code: 'T9999',
        name: 'New Customer',
      });
      const setShowForm = vi.fn();

      const { result } = renderFormActions({
        isEditMode: false,
        selectedCustomerId: null,
        createCustomer,
        setShowForm,
      });

      const fakeBlob = new Blob(['face-image'], { type: 'image/jpeg' });
      act(() => {
        result.current.setPendingFaceImage(fakeBlob);
      });

      await result.current.handleSubmit({
        name: 'New Customer',
        phone: '0909999999',
      } as unknown as Parameters<typeof result.current.handleSubmit>[0]);

      await waitFor(() => {
        expect(setShowForm).toHaveBeenCalledWith(false);
      });
      expect(createCustomer).toHaveBeenCalled();
    });
  });

  describe('edit mode', () => {
    it('does not call registerFace in edit mode', async () => {
      const { registerFace } = await import('@/lib/api');
      const updateCustomer = vi.fn().mockResolvedValue(undefined);
      const refetchProfile = vi.fn().mockResolvedValue(undefined);

      const { result } = renderFormActions({
        isEditMode: true,
        selectedCustomerId: 'customer-1',
        updateCustomer,
        refetchProfile,
      });

      await result.current.handleSubmit({
        name: 'Updated Customer',
        phone: '0909000000',
      } as unknown as Parameters<typeof result.current.handleSubmit>[0]);

      expect(updateCustomer).toHaveBeenCalledWith('customer-1', expect.any(Object));
      expect(registerFace).not.toHaveBeenCalled();
    });
  });
});
