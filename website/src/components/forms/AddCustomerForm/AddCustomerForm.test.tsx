import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { AddCustomerForm } from './AddCustomerForm';

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
});
