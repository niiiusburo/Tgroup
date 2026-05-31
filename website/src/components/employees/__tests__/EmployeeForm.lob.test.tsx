import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { EmployeeForm } from '../EmployeeForm';
import { createEmployee, fetchCompanies, fetchPermissionGroups, updateEmployee } from '@/lib/api';

vi.mock('@/contexts/BusinessUnitContext', () => ({
  useBusinessUnit: () => ({ currentLOB: 'cosmetic' }),
  // Passthrough so renderWithProviders (which renders <BusinessUnitProvider>) works under this mock.
  BusinessUnitProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/api', () => ({
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  fetchCompanies: vi.fn(),
  fetchPermissionGroups: vi.fn(),
}));

const cosmeticCompanies = [
  { id: 'cos-hn', name: 'Thẩm mỹ Hà Nội', phone: null, active: true },
  { id: 'cos-hcm', name: 'Thẩm mỹ Hồ Chí Minh', phone: null, active: true },
];

describe('EmployeeForm LOB routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchCompanies).mockResolvedValue({
      items: cosmeticCompanies,
      offset: 0,
      limit: 50,
      totalItems: 2,
    } as any);
    vi.mocked(fetchPermissionGroups).mockResolvedValue([]);
    vi.mocked(createEmployee).mockResolvedValue({
      id: 'emp-cosmetic',
      name: 'Cosmetic Employee',
      ref: null,
      phone: null,
      email: null,
      avatar: null,
      isdoctor: true,
      isassistant: false,
      isreceptionist: false,
      active: true,
      companyid: null,
      companyname: null,
      hrjobid: null,
      hrjobname: null,
      wage: null,
      allowance: null,
      startworkdate: null,
      datecreated: null,
      lastupdated: null,
    } as any);
    vi.mocked(updateEmployee).mockResolvedValue({ id: 'emp-existing', name: 'Edited Employee' } as any);
  });

  it('loads branch choices from the active cosmetic LOB', async () => {
    renderWithProviders(<EmployeeForm onClose={vi.fn()} onSave={vi.fn()} />);

    await waitFor(() => {
      expect(fetchCompanies).toHaveBeenCalledWith({ limit: 50, lob: 'cosmetic' });
    });
    expect(await screen.findByText('Thẩm mỹ Hà Nội')).toBeInTheDocument();
    expect(screen.queryByText(/Tấm Dentist/)).not.toBeInTheDocument();
  });

  it('fetches permission groups (tiers) with the active cosmetic LOB', async () => {
    renderWithProviders(<EmployeeForm onClose={vi.fn()} onSave={vi.fn()} />);

    await waitFor(() => {
      expect(fetchPermissionGroups).toHaveBeenCalledWith('cosmetic');
    });
  });

  it('creates employees through the active cosmetic LOB', async () => {
    renderWithProviders(<EmployeeForm onClose={vi.fn()} onSave={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Nhập họ và tên'), {
      target: { value: 'Cosmetic Employee' },
    });
    fireEvent.change(screen.getByPlaceholderText('Nhập mật khẩu'), {
      target: { value: 'secret123' },
    });
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(createEmployee).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Cosmetic Employee', password: 'secret123' }),
        'cosmetic',
      );
    });
  });

  it('updates employees through the active cosmetic LOB', async () => {
    renderWithProviders(
      <EmployeeForm
        employee={{
          id: 'emp-existing',
          name: 'Existing Employee',
          isdoctor: true,
          isassistant: false,
          isreceptionist: false,
          active: true,
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Nhập họ và tên'), {
      target: { value: 'Edited Employee' },
    });
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(updateEmployee).toHaveBeenCalledWith(
        'emp-existing',
        expect.objectContaining({ name: 'Edited Employee' }),
        'cosmetic',
      );
    });
  });
});
