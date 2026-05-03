import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArchitectureView } from './ArchitectureView';
import type { EmployeePermission, PermissionGroup } from '@/lib/api';

const adminGroup: PermissionGroup = {
  id: 'admin',
  name: 'Admin',
  color: '#ef4444',
  description: 'Admin access',
  isSystem: true,
  permissions: ['permissions.view'],
};

const employees: EmployeePermission[] = [
  {
    employeeId: 'admin-t',
    employeeName: 'Admin T',
    employeeEmail: 't@clinic.vn',
    groupId: 'admin',
    groupName: 'Admin',
    groupColor: '#ef4444',
    locScope: 'all',
    locations: [],
    overrides: { grant: [], revoke: [] },
  },
  {
    employeeId: 'front-desk',
    employeeName: 'Front Desk',
    employeeEmail: 'frontdesk@clinic.vn',
    groupId: 'admin',
    groupName: 'Admin',
    groupColor: '#ef4444',
    locScope: 'all',
    locations: [],
    overrides: { grant: [], revoke: [] },
  },
];

describe('ArchitectureView employee search', () => {
  it('finds an employee by email address', () => {
    render(
      <ArchitectureView
        groups={[adminGroup]}
        employees={employees}
        locations={[]}
        selectedGroupId={null}
        selectedEmployeeId={null}
        onSelectGroup={vi.fn()}
        onSelectEmployee={vi.fn()}
        getEffective={() => ['permissions.view']}
        updateEmployee={vi.fn()}
        canEdit={false}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Search employees, tiers, locations...'), {
      target: { value: 't@clinic.vn' },
    });

    expect(screen.getByText('Admin T')).toBeInTheDocument();
    expect(screen.getByText('t@clinic.vn')).toBeInTheDocument();
    expect(screen.queryByText('Front Desk')).not.toBeInTheDocument();
  });
});
