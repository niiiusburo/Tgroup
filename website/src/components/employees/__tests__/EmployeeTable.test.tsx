import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmployeeTable } from '../EmployeeTable';
import type { Employee } from '@/data/mockEmployees';

const employee: Employee = {
  id: 'emp-001',
  name: 'Nguyễn Thị Cẩm Thơ',
  avatar: 'NT',
  tierId: 'editor',
  tierName: 'Editor',
  roles: ['doctor', 'receptionist', 'customer-service'],
  status: 'active',
  locationId: 'loc-main',
  locationName: 'Tân Bình - Cộng Hòa Chi Nhánh Có Tên Rất Dài',
  locationScopeIds: ['loc-extra-1', 'loc-extra-2'],
  phone: '0900000000',
  email: 'camtho@example.com',
  schedule: [],
  linkedEmployeeIds: [],
  hireDate: '2024-05-18',
};

describe('EmployeeTable', () => {
  it('keeps the edit action visible and bounds long location text', () => {
    render(
      <EmployeeTable
        employees={[employee]}
        selectedEmployeeId={null}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        locationNameMap={
          new Map([
            ['loc-extra-1', 'Tăng Lực - Nguyễn Thái Bình Chi Nhánh Dài'],
            ['loc-extra-2', 'Tân Phú - Luỹ Bán Bích Chi Nhánh Dài'],
          ])
        }
      />,
    );

    const editButton = screen.getByTestId('employee-edit-action');
    expect(editButton).toBeVisible();
    expect(editButton.closest('td')).toHaveClass('sticky', 'right-0');

    const locationText = screen.getByTitle(
      'Tân Bình - Cộng Hòa Chi Nhánh Có Tên Rất Dài, Tăng Lực - Nguyễn Thái Bình Chi Nhánh Dài, Tân Phú - Luỹ Bán Bích Chi Nhánh Dài',
    );
    expect(locationText).toHaveClass('min-w-0', 'truncate');
    expect(locationText.parentElement).toHaveClass('max-w-[180px]', 'min-w-0');
  });
});
