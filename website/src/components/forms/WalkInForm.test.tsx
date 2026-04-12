import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WalkInForm } from './WalkInForm';
import * as api from '@/lib/api';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    fetchEmployees: vi.fn().mockResolvedValue({ items: [] }),
    fetchProducts: vi.fn().mockResolvedValue({ items: [] }),
    createPartner: vi.fn().mockResolvedValue({ id: 'cust-1', name: 'Nguyễn Văn A', phone: '0901111222', companyid: 'loc-1' }),
    createAppointment: vi.fn().mockResolvedValue({}),
    createSaleOrder: vi.fn().mockResolvedValue({}),
  };
});

describe('WalkInForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required fields for 30-second check-in workflow', () => {
    render(<WalkInForm onCancel={() => {}} />);

    expect(screen.getByText('Họ và tên')).toBeInTheDocument();
    expect(screen.getByText('Số điện thoại')).toBeInTheDocument();
    expect(screen.getByText('Giới tính')).toBeInTheDocument();
    expect(screen.getByText('Năm sinh')).toBeInTheDocument();
    expect(screen.getByText('Bác sĩ')).toBeInTheDocument();
    expect(screen.getByText('Dịch vụ')).toBeInTheDocument();
    expect(screen.getByText('Ghi chú / Triệu chứng')).toBeInTheDocument();

    expect(screen.getByLabelText('Nam')).toBeInTheDocument();
    expect(screen.getByLabelText('Nữ')).toBeInTheDocument();
    expect(screen.getByLabelText('Khác')).toBeInTheDocument();
  });

  it('submits with gender, birthyear and note included in createPartner', async () => {
    const onSuccess = vi.fn();
    render(<WalkInForm locationId="loc-1" onSuccess={onSuccess} onCancel={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText('Nhập họ và tên'), { target: { value: 'Nguyễn Văn A' } });
    fireEvent.change(screen.getByPlaceholderText('0901 111 222'), { target: { value: '0901111222' } });
    fireEvent.click(screen.getByLabelText('Nam'));

    fireEvent.change(screen.getByTestId('walkin-birthyear'), { target: { value: '1990' } });

    fireEvent.change(screen.getByPlaceholderText('Nhập ghi chú hoặc triệu chứng nhanh...'), { target: { value: 'Đau răng' } });

    fireEvent.click(screen.getByText('Lưu và tiếp nhận'));

    await waitFor(() => {
      expect(api.createPartner).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Nguyễn Văn A',
          phone: '0901111222',
          gender: 'male',
          birthyear: 1990,
          comment: 'Đau răng',
        })
      );
    });

    await waitFor(() => {
      expect(api.createAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          note: 'Khách vãng lai — Đau răng',
        })
      );
    });

    expect(onSuccess).toHaveBeenCalled();
  });
});
