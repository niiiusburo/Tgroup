import { renderHook } from '@testing-library/react';
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
});
