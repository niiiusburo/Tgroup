import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DoctorSelector } from './DoctorSelector';
import type { Employee } from '@/types/employee';

const mockEmployees: Employee[] = [
  { id: '1', name: 'Dr. A', avatar: 'A', roles: ['doctor'], status: 'active', locationId: 'loc1', locationName: 'Loc 1', phone: '', email: '', schedule: [], linkedEmployeeIds: [], hireDate: '' },
  { id: '2', name: 'Asst B', avatar: 'B', roles: ['assistant'], status: 'active', locationId: 'loc1', locationName: 'Loc 1', phone: '', email: '', schedule: [], linkedEmployeeIds: [], hireDate: '' },
  { id: '3', name: 'Dr. C', avatar: 'C', roles: ['doctor', 'assistant'], status: 'active', locationId: 'loc1', locationName: 'Loc 1', phone: '', email: '', schedule: [], linkedEmployeeIds: [], hireDate: '' },
  { id: '4', name: 'Reception D', avatar: 'D', roles: ['receptionist'], status: 'active', locationId: 'loc1', locationName: 'Loc 1', phone: '', email: '', schedule: [], linkedEmployeeIds: [], hireDate: '' },
];

describe('DoctorSelector role filtering', () => {
  it('shows only doctors when filterRoles is [doctor]', () => {
    const onChange = vi.fn();
    render(<DoctorSelector employees={mockEmployees} selectedId="" onChange={onChange} filterRoles={['doctor']} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(screen.getByText('Dr. A')).toBeInTheDocument();
    expect(screen.getByText('Dr. C')).toBeInTheDocument();
    expect(screen.queryByText('Asst B')).not.toBeInTheDocument();
    expect(screen.queryByText('Reception D')).not.toBeInTheDocument();
  });

  it('shows only assistants when filterRoles is [assistant]', () => {
    const onChange = vi.fn();
    render(<DoctorSelector employees={mockEmployees} selectedId="" onChange={onChange} filterRoles={['assistant']} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(screen.queryByText('Dr. A')).not.toBeInTheDocument();
    expect(screen.getByText('Asst B')).toBeInTheDocument();
    expect(screen.getByText('Dr. C')).toBeInTheDocument();
    expect(screen.queryByText('Reception D')).not.toBeInTheDocument();
  });

  it('shows all employees when filterRoles is not provided', () => {
    const onChange = vi.fn();
    render(<DoctorSelector employees={mockEmployees} selectedId="" onChange={onChange} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(screen.getByText('Dr. A')).toBeInTheDocument();
    expect(screen.getByText('Asst B')).toBeInTheDocument();
    expect(screen.getByText('Dr. C')).toBeInTheDocument();
    expect(screen.getByText('Reception D')).toBeInTheDocument();
  });
});
