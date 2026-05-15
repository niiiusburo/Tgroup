import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TodayServicesTable } from './TodayServicesTable';
import { useTodayServices } from '@/hooks/useTodayServices';

vi.mock('@/hooks/useTodayServices', () => ({
  useTodayServices: vi.fn(),
}));

describe('TodayServicesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTodayServices).mockReturnValue({
      services: [
        {
          id: 'line-1',
          serviceName: 'Tẩy trắng răng',
          patientName: 'Nguyễn Văn A',
          patientPhone: '0901111222',
          patientCode: 'T9001',
          quantity: 2,
          doctorName: 'Bác sĩ Đạt',
          amount: 1500000,
          status: 'completed',
          orderName: 'SO-2026-0001',
          date: '2026-05-09',
        },
      ],
      allServices: [
        {
          id: 'line-1',
          serviceName: 'Tẩy trắng răng',
          patientName: 'Nguyễn Văn A',
          patientPhone: '0901111222',
          patientCode: 'T9001',
          quantity: 2,
          doctorName: 'Bác sĩ Đạt',
          amount: 1500000,
          status: 'completed',
          orderName: 'SO-2026-0001',
          date: '2026-05-09',
        },
      ],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it('renders service activity rows from the hook', () => {
    render(<TodayServicesTable locationId="location-1" />);

    expect(screen.getByText('Tẩy trắng răng')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('T9001')).toBeInTheDocument();
    expect(screen.getByText('Bác sĩ Đạt')).toBeInTheDocument();
    expect(screen.getByText(/1\.500\.000/)).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('passes search text into the service hook', () => {
    render(<TodayServicesTable locationId="location-1" />);

    fireEvent.change(screen.getByPlaceholderText('Search services...'), {
      target: { value: 'tay trang' },
    });

    expect(useTodayServices).toHaveBeenLastCalledWith('location-1', 'tay trang');
  });
});
