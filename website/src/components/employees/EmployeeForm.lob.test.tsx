import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmployeeForm } from './EmployeeForm';
import { TimezoneProvider } from '@/contexts/TimezoneContext';

const mockBusinessUnit = vi.hoisted(() => ({
  currentLOB: 'cosmetic' as 'dental' | 'cosmetic',
}));

vi.mock('@/contexts/BusinessUnitContext', () => ({
  useBusinessUnit: () => ({
    currentLOB: mockBusinessUnit.currentLOB,
    setCurrentLOB: vi.fn(),
    availableLOBs: ['dental', 'cosmetic'],
    isMultiLOBUser: true,
    isCosmeticEnabled: true,
  }),
}));

vi.mock('@/lib/api', () => ({
  createEmployee: vi.fn().mockResolvedValue({
    id: 'employee-1',
    name: 'Cosmetic Staff',
    ref: null,
    phone: null,
    email: null,
    avatar: null,
    isdoctor: true,
    isassistant: false,
    isreceptionist: false,
    active: true,
    companyid: 'cosmetic-branch-1',
    companyname: 'Cosmetic Branch 1',
    hrjobid: null,
    hrjobname: null,
    wage: null,
    allowance: null,
    startworkdate: null,
    datecreated: null,
    lastupdated: null,
  }),
  updateEmployee: vi.fn(),
  fetchCompanies: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'cosmetic-branch-1',
        name: 'Cosmetic Branch 1',
        phone: null,
        active: true,
      },
    ],
  }),
  fetchPermissionGroups: vi.fn().mockResolvedValue([]),
}));

import { createEmployee, fetchCompanies, updateEmployee } from '@/lib/api';

describe('EmployeeForm cosmetic LOB routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBusinessUnit.currentLOB = 'cosmetic';
  });

  it('loads cosmetic branches and creates employees through the cosmetic mirror route', async () => {
    const onSave = vi.fn();
    render(
      <TimezoneProvider>
        <EmployeeForm onClose={vi.fn()} onSave={onSave} />
      </TimezoneProvider>,
    );

    await waitFor(() => {
      expect(fetchCompanies).toHaveBeenCalledWith({ lob: 'cosmetic' });
    });

    fireEvent.change(screen.getByPlaceholderText('enterName'), {
      target: { value: 'Cosmetic Staff' },
    });
    fireEvent.change(screen.getByPlaceholderText('nhpMtKhu'), {
      target: { value: 'secret123' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'thmNhnVin' }));

    await waitFor(() => {
      expect(createEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Cosmetic Staff',
          password: 'secret123',
        }),
        'cosmetic',
      );
    });
  });

  it('updates employees through the cosmetic mirror route', async () => {
    vi.mocked(updateEmployee).mockResolvedValue({
      id: 'employee-1',
      name: 'Cosmetic Staff Updated',
      ref: null,
      phone: null,
      email: null,
      avatar: null,
      isdoctor: true,
      isassistant: false,
      isreceptionist: false,
      active: true,
      companyid: 'cosmetic-branch-1',
      companyname: 'Cosmetic Branch 1',
      hrjobid: null,
      hrjobname: null,
      wage: null,
      allowance: null,
      startworkdate: null,
      datecreated: null,
      lastupdated: null,
    });

    render(
      <TimezoneProvider>
        <EmployeeForm
          employee={{
            id: 'employee-1',
            name: 'Cosmetic Staff',
            ref: null,
            phone: null,
            email: null,
            avatar: null,
            isdoctor: true,
            isassistant: false,
            isreceptionist: false,
            active: true,
            companyid: 'cosmetic-branch-1',
            companyname: 'Cosmetic Branch 1',
            hrjobid: null,
            hrjobname: null,
            wage: null,
            allowance: null,
            startworkdate: null,
            datecreated: null,
            lastupdated: null,
          }}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      </TimezoneProvider>,
    );

    fireEvent.change(screen.getByPlaceholderText('enterName'), {
      target: { value: 'Cosmetic Staff Updated' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'cpNht' }));

    await waitFor(() => {
      expect(updateEmployee).toHaveBeenCalledWith(
        'employee-1',
        expect.objectContaining({
          name: 'Cosmetic Staff Updated',
        }),
        'cosmetic',
      );
    });
  });
});
