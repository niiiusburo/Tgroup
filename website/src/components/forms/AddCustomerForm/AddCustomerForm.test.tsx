import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { AddCustomerForm } from './AddCustomerForm';
import { fetchEmployees } from '@/lib/api';

vi.mock('@/lib/api', async () => {
  class ApiError extends Error {
    status = 500;
  }

  return {
    ApiError,
    apiFetch: vi.fn(),
    fetchCompanies: vi.fn().mockResolvedValue({ items: [] }),
    fetchEmployees: vi.fn().mockResolvedValue({ items: [] }),
    fetchPartners: vi.fn().mockResolvedValue({ items: [] }),
    fetchPartnerById: vi.fn().mockResolvedValue(null),
  };
});

vi.mock('@/hooks/useUniqueFieldCheck', () => ({
  useUniqueFieldCheck: () => ({ status: 'idle' }),
}));

vi.mock('@/hooks/useFaceRecognition', () => ({
  useFaceRecognition: () => ({
    recognizeState: { status: 'idle' },
    registerState: { status: 'idle' },
    recognize: vi.fn(),
    register: vi.fn(),
    reset: vi.fn(),
  }),
}));

describe('AddCustomerForm', () => {
  it('does not render customer source in the customer profile form', () => {
    renderWithProviders(
      <AddCustomerForm
        isEdit
        canEdit
        initialData={{
          name: 'Test Patient',
          phone: '0909123456',
          sourceid: 'source-online',
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('form.notes')).toBeInTheDocument();
    expect(screen.queryByText('form.customerSource')).not.toBeInTheDocument();
    expect(screen.queryByText('Nguồn khách hàng')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('source-online')).not.toBeInTheDocument();
  });

  it('pre-populates inactive assigned sales staff in edit mode', async () => {
    vi.mocked(fetchEmployees).mockResolvedValueOnce({
      items: [
        {
          id: '013fd634-4d88-45c6-9f3b-afe3007c9fb5',
          name: 'Sale Nhung',
          ref: 'NV00012',
          phone: '0972969454',
          email: null,
          avatar: null,
          isdoctor: false,
          isassistant: true,
          isreceptionist: false,
          active: false,
          companyid: 'loc-1',
          companyname: 'Tấm Dentist Quận 3',
          locationScopeIds: [],
          hrjobid: null,
          hrjobname: null,
          tierId: null,
          tierName: null,
          jobtitle: null,
          wage: null,
          allowance: null,
          startworkdate: null,
          datecreated: null,
          lastupdated: null,
        },
      ],
    } as any);

    renderWithProviders(
      <AddCustomerForm
        isEdit
        canEdit
        initialData={{
          name: 'NGUYỄN THỊ HỒNG VÂN',
          phone: '0987305476',
          salestaffid: '013fd634-4d88-45c6-9f3b-afe3007c9fb5',
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Sale Nhung')).toBeInTheDocument();
    });
    expect(fetchEmployees).toHaveBeenCalledWith({ limit: 500, active: 'all' });
  });

  it('pre-populates inactive assigned CSKH staff in edit mode', async () => {
    vi.mocked(fetchEmployees).mockResolvedValueOnce({
      items: [
        {
          id: 'cskh-inactive-1',
          name: 'CSKH Trang',
          ref: 'NV00021',
          phone: null,
          email: null,
          avatar: null,
          isdoctor: false,
          isassistant: false,
          isreceptionist: true,
          active: false,
          companyid: 'loc-1',
          companyname: 'Tấm Dentist Quận 3',
          locationScopeIds: [],
          hrjobid: null,
          hrjobname: null,
          tierId: null,
          tierName: null,
          jobtitle: null,
          wage: null,
          allowance: null,
          startworkdate: null,
          datecreated: null,
          lastupdated: null,
        },
      ],
    } as any);

    renderWithProviders(
      <AddCustomerForm
        isEdit
        canEdit
        initialData={{
          name: 'Customer With CSKH',
          phone: '0909000000',
          cskhid: 'cskh-inactive-1',
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('CSKH Trang')).toBeInTheDocument();
    });
    expect(fetchEmployees).toHaveBeenCalledWith({ limit: 500, active: 'all' });
  });
});
