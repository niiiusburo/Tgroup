import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DoctorSelector } from '../DoctorSelector';

const mockEmployees = [
  { id: 'doc-1', name: 'BS. Nguyễn Văn A', roles: ['doctor' as const], status: 'active' as const },
  { id: 'doc-2', name: 'BS. Trần Thị B', roles: ['doctor' as const], status: 'active' as const },
];

describe('DoctorSelector', () => {
  it('shows empty message when employees prop is empty', () => {
    render(
      <DoctorSelector
        employees={[]}
        selectedId={null}
        onChange={vi.fn()}
        placeholder="Chọn bác sĩ"
      />
    );

    fireEvent.click(screen.getByText('Chọn bác sĩ'));
    expect(screen.getByText('Không tìm thấy bác sĩ')).toBeInTheDocument();
  });

  it('shows empty message when all employees are inactive', () => {
    render(
      <DoctorSelector
        employees={[
          { id: 'doc-1', name: 'Inactive Doc', roles: ['doctor' as const], status: 'inactive' as const },
        ]}
        selectedId={null}
        onChange={vi.fn()}
        placeholder="Chọn bác sĩ"
      />
    );

    fireEvent.click(screen.getByText('Chọn bác sĩ'));
    expect(screen.getByText('Không tìm thấy bác sĩ')).toBeInTheDocument();
  });

  it('renders active doctors when data is available', () => {
    render(
      <DoctorSelector
        employees={mockEmployees}
        selectedId={null}
        onChange={vi.fn()}
        placeholder="Chọn bác sĩ"
      />
    );

    fireEvent.click(screen.getByText('Chọn bác sĩ'));
    expect(screen.getByText('BS. Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('BS. Trần Thị B')).toBeInTheDocument();
  });
});
