import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { JoinCtv } from './JoinCtv';
import { joinCtv, lookupPublicCtvByPhone, resolveCtvRefCode } from '@/lib/api/ctv';

vi.mock('@/lib/api/ctv', () => ({
  joinCtv: vi.fn(),
  lookupPublicCtvByPhone: vi.fn(),
  resolveCtvRefCode: vi.fn(),
}));

function renderJoin(initialEntry = '/ctv/join') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <JoinCtv />
    </MemoryRouter>,
  );
}

describe('JoinCtv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(joinCtv).mockResolvedValue({
      ok: true,
      id: 'new-ctv',
      name: 'New CTV',
      uplineName: 'Parent CTV',
    });
    vi.mocked(lookupPublicCtvByPhone).mockResolvedValue({ exists: true, name: 'Parent CTV' });
  });

  it('renders direct public signup without requiring a referral code', () => {
    renderJoin();

    expect(screen.getByRole('heading', { name: /Đăng ký Cộng tác viên/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/CTV giới thiệu/i)).toBeInTheDocument();
    expect(screen.queryByText(/Liên kết giới thiệu không hợp lệ/i)).not.toBeInTheDocument();
    expect(resolveCtvRefCode).not.toHaveBeenCalled();
  });

  it('submits direct public signup with uplinePhone', async () => {
    renderJoin();

    fireEvent.change(screen.getByLabelText(/^Họ tên$/i), { target: { value: 'New CTV' } });
    fireEvent.change(screen.getByLabelText(/Số điện thoại của bạn/i), { target: { value: '0123456789' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu$/i), { target: { value: 'secret1' } });
    fireEvent.change(screen.getByLabelText(/CTV giới thiệu/i), { target: { value: '0909000000' } });

    await waitFor(() => expect(lookupPublicCtvByPhone).toHaveBeenCalledWith('0909000000'));
    expect(await screen.findByText(/CTV hợp lệ: Parent CTV/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Tạo tài khoản CTV/i }));

    await waitFor(() => {
      expect(joinCtv).toHaveBeenCalledWith({
        name: 'New CTV',
        phone: '0123456789',
        email: 'new@example.com',
        password: 'secret1',
        uplinePhone: '0909000000',
      });
    });
    expect(await screen.findByText(/Tạo tài khoản CTV thành công/i)).toBeInTheDocument();
  });

  it('uses the referral code when a valid link is present and no upline phone is typed', async () => {
    vi.mocked(resolveCtvRefCode).mockResolvedValue({
      ok: true,
      uplineId: 'parent-ctv',
      uplineName: 'Parent CTV',
    });

    renderJoin('/ctv/join?ref=CTV-ABCDEF');

    expect(await screen.findByText(/Parent CTV/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Họ tên$/i), { target: { value: 'New CTV' } });
    fireEvent.change(screen.getByLabelText(/Số điện thoại của bạn/i), { target: { value: '0123456789' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu$/i), { target: { value: 'secret1' } });
    fireEvent.click(screen.getByRole('button', { name: /Tạo tài khoản CTV/i }));

    await waitFor(() => {
      expect(joinCtv).toHaveBeenCalledWith({
        name: 'New CTV',
        phone: '0123456789',
        email: 'new@example.com',
        password: 'secret1',
        code: 'CTV-ABCDEF',
      });
    });
  });

  it('submits successfully without an email (email is optional)', async () => {
    renderJoin();

    fireEvent.change(screen.getByLabelText(/^Họ tên$/i), { target: { value: 'No Email CTV' } });
    fireEvent.change(screen.getByLabelText(/Số điện thoại của bạn/i), { target: { value: '0123456789' } });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu$/i), { target: { value: 'secret1' } });
    fireEvent.change(screen.getByLabelText(/CTV giới thiệu/i), { target: { value: '0909000000' } });

    await waitFor(() => expect(lookupPublicCtvByPhone).toHaveBeenCalledWith('0909000000'));
    expect(await screen.findByText(/CTV hợp lệ: Parent CTV/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Tạo tài khoản CTV/i }));

    await waitFor(() => {
      expect(joinCtv).toHaveBeenCalledWith({
        name: 'No Email CTV',
        phone: '0123456789',
        email: '',
        password: 'secret1',
        uplinePhone: '0909000000',
      });
    });
  });

  it('requires upline phone when no valid referral code is available', async () => {
    renderJoin();

    fireEvent.change(screen.getByLabelText(/^Họ tên$/i), { target: { value: 'New CTV' } });
    fireEvent.change(screen.getByLabelText(/Số điện thoại của bạn/i), { target: { value: '0123456789' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu$/i), { target: { value: 'secret1' } });
    fireEvent.click(screen.getByRole('button', { name: /Tạo tài khoản CTV/i }));

    expect(await screen.findByText(/Vui lòng nhập số điện thoại CTV giới thiệu/i)).toBeInTheDocument();
    expect(joinCtv).not.toHaveBeenCalled();
  });

  it('blocks direct signup when the typed upline CTV phone is not in the system', async () => {
    vi.mocked(lookupPublicCtvByPhone).mockResolvedValueOnce({ exists: false, name: null });
    renderJoin();

    fireEvent.change(screen.getByLabelText(/^Họ tên$/i), { target: { value: 'New CTV' } });
    fireEvent.change(screen.getByLabelText(/Số điện thoại của bạn/i), { target: { value: '0123456789' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu$/i), { target: { value: 'secret1' } });
    fireEvent.change(screen.getByLabelText(/CTV giới thiệu/i), { target: { value: '0999999999' } });

    await waitFor(() => expect(lookupPublicCtvByPhone).toHaveBeenCalledWith('0999999999'));
    expect(await screen.findByText(/Không tìm thấy CTV theo số điện thoại này/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Tạo tài khoản CTV/i }));

    expect(joinCtv).not.toHaveBeenCalled();
  });
});
