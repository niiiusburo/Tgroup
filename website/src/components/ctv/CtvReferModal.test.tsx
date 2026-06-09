import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '@/i18n';
import { CtvReferModal } from './CtvReferModal';
import {
  createBooking,
  createPublicBooking,
  fetchCtvServices,
  fetchPublicCtvServices,
  lookupClientByPhone,
  lookupPublicCtvByPhone,
  lookupPublicClientByPhone,
} from '@/lib/api/ctv';
import { TimezoneProvider } from '@/contexts/TimezoneContext';

vi.mock('@/lib/api/ctv', () => ({
  createBooking: vi.fn(),
  createPublicBooking: vi.fn(),
  fetchCtvServices: vi.fn(),
  fetchPublicCtvServices: vi.fn(),
  lookupClientByPhone: vi.fn(),
  lookupPublicCtvByPhone: vi.fn(),
  lookupPublicClientByPhone: vi.fn(),
}));

const mockedCreateBooking = vi.mocked(createBooking);
const mockedCreatePublicBooking = vi.mocked(createPublicBooking);
const mockedFetchCtvServices = vi.mocked(fetchCtvServices);
const mockedFetchPublicCtvServices = vi.mocked(fetchPublicCtvServices);
const mockedLookupClientByPhone = vi.mocked(lookupClientByPhone);
const mockedLookupPublicCtvByPhone = vi.mocked(lookupPublicCtvByPhone);
const mockedLookupPublicClientByPhone = vi.mocked(lookupPublicClientByPhone);

function renderReferModal(props: Partial<React.ComponentProps<typeof CtvReferModal>> = {}) {
  return render(
    <TimezoneProvider>
      <CtvReferModal open onClose={vi.fn()} onSuccess={vi.fn()} {...props} />
    </TimezoneProvider>
  );
}

describe('CtvReferModal', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
    mockedCreateBooking.mockResolvedValue({ clientId: 'client-1', appointmentId: 'appt-1' });
    mockedCreatePublicBooking.mockResolvedValue({ clientId: 'client-1', appointmentId: 'appt-1' });
    mockedFetchCtvServices.mockResolvedValue({ services: [] });
    mockedFetchPublicCtvServices.mockResolvedValue({ services: [] });
    mockedLookupClientByPhone.mockResolvedValue({ exists: false, lob: 'cosmetic' });
    mockedLookupPublicCtvByPhone.mockResolvedValue({ exists: true, name: 'Parent CTV' });
    mockedLookupPublicClientByPhone.mockResolvedValue({ exists: false, lob: 'cosmetic' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('prefills the appointment date with today in Vietnam time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T18:30:00.000Z'));
    const { container } = renderReferModal();

    expect(container.querySelector('input[type="date"]')).toBeNull();
    expect(screen.getByRole('button', { name: /ngày hẹn: 01\/06\/2026/i })).toBeInTheDocument();
  });

  it('submits a booking without requiring the CTV to manually pick today', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T18:30:00.000Z'));
    const { container } = renderReferModal();
    vi.useRealTimers();
    const [phoneInput, nameInput] = Array.from(container.querySelectorAll('input')) as HTMLInputElement[];

    fireEvent.change(nameInput, { target: { value: 'thuan test' } });
    fireEvent.change(phoneInput, { target: { value: '0123123123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thẩm mỹ' }));
    fireEvent.click(screen.getByRole('button', { name: /giới thiệu khách/i }));

    await waitFor(() => expect(mockedCreateBooking).toHaveBeenCalledTimes(1));
    expect(mockedCreateBooking).toHaveBeenCalledWith({
      name: 'thuan test',
      phone: '0123123123',
      lob: 'cosmetic',
      date: '2026-06-01',
      productId: undefined,
      note: undefined,
    });
    expect(screen.queryByText('Vui lòng nhập đầy đủ thông tin')).not.toBeInTheDocument();
  });

  it('prefills the name when phone lookup finds an available existing client', async () => {
    mockedLookupClientByPhone.mockResolvedValueOnce({
      exists: true,
      lob: 'cosmetic',
      clientId: 'client-1',
      name: 'thuan test',
      claimed: false,
      claimedByMe: false,
    });
    const { container } = renderReferModal();
    const [phoneInput, nameInput] = Array.from(container.querySelectorAll('input')) as HTMLInputElement[];

    fireEvent.click(screen.getByRole('button', { name: 'Thẩm mỹ' }));
    fireEvent.change(phoneInput, { target: { value: '0123123123' } });

    await waitFor(() => expect(mockedLookupClientByPhone).toHaveBeenCalledWith('0123123123', 'cosmetic'));
    await waitFor(() => expect(nameInput).toHaveValue('thuan test'));
  });

  it('does not prefill the name when phone lookup says another CTV owns the client', async () => {
    mockedLookupClientByPhone.mockResolvedValueOnce({
      exists: true,
      lob: 'cosmetic',
      clientId: 'client-2',
      name: 'claimed client',
      claimed: true,
      claimedByMe: false,
      ownerName: 'Other CTV',
    });
    const { container } = renderReferModal();
    const [phoneInput, nameInput] = Array.from(container.querySelectorAll('input')) as HTMLInputElement[];

    fireEvent.click(screen.getByRole('button', { name: 'Thẩm mỹ' }));
    fireEvent.change(phoneInput, { target: { value: '0999888777' } });

    await waitFor(() => expect(mockedLookupClientByPhone).toHaveBeenCalledWith('0999888777', 'cosmetic'));
    expect(nameInput).toHaveValue('');
  });

  it('opens the custom calendar in flow instead of the native iOS date popup', () => {
    const { container } = renderReferModal();

    fireEvent.click(screen.getByRole('button', { name: /ngày hẹn/i }));

    const panel = screen.getByTestId('date-picker-panel');
    expect(container.querySelector('input[type="date"]')).toBeNull();
    expect(panel).toBeInTheDocument();
    expect(panel).not.toHaveClass('absolute');
  });

  it('keeps the close button outside the scrollable booking body', () => {
    const { container } = renderReferModal();

    const dialog = screen.getByRole('dialog', { name: /giới thiệu khách/i });
    const closeButton = screen.getByRole('button', { name: 'Đóng' });
    const scrollBody = container.querySelector('.overflow-y-auto');

    expect(dialog).toContainElement(closeButton);
    expect(scrollBody).toBeInTheDocument();
    expect(scrollBody).not.toContainElement(closeButton);
    expect(scrollBody).toContainElement(screen.getByRole('button', { name: /ngày hẹn/i }));
    expect(scrollBody).toContainElement(screen.getByRole('button', { name: /giới thiệu khách/i }));
  });

  it('public mode collects the CTV phone and submits through the public booking API', async () => {
    const { container } = renderReferModal({ publicMode: true });
    const [phoneInput, nameInput, ctvPhoneInput] = Array.from(container.querySelectorAll('input')) as HTMLInputElement[];

    fireEvent.change(phoneInput, { target: { value: '0123123123' } });
    fireEvent.change(nameInput, { target: { value: 'Public Client' } });
    fireEvent.change(ctvPhoneInput, { target: { value: '0909000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thẩm mỹ' }));

    await waitFor(() => expect(mockedLookupPublicCtvByPhone).toHaveBeenCalledWith('0909000000'));
    expect(await screen.findByText(/CTV hợp lệ: Parent CTV/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /giới thiệu khách/i }));

    await waitFor(() => expect(mockedCreatePublicBooking).toHaveBeenCalledTimes(1));
    expect(mockedCreatePublicBooking).toHaveBeenCalledWith({
      name: 'Public Client',
      phone: '0123123123',
      lob: 'cosmetic',
      date: expect.any(String),
      productId: undefined,
      note: undefined,
      ctvPhone: '0909000000',
    });
    expect(mockedCreateBooking).not.toHaveBeenCalled();
  });

  it('public mode blocks submit when the typed CTV phone is not in the system', async () => {
    mockedLookupPublicCtvByPhone.mockResolvedValueOnce({ exists: false, name: null });
    const { container } = renderReferModal({ publicMode: true });
    const [phoneInput, nameInput, ctvPhoneInput] = Array.from(container.querySelectorAll('input')) as HTMLInputElement[];

    fireEvent.change(phoneInput, { target: { value: '0123123123' } });
    fireEvent.change(nameInput, { target: { value: 'Public Client' } });
    fireEvent.change(ctvPhoneInput, { target: { value: '0999999999' } });

    await waitFor(() => expect(mockedLookupPublicCtvByPhone).toHaveBeenCalledWith('0999999999'));
    expect(await screen.findByText(/Không tìm thấy CTV theo số điện thoại này/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /giới thiệu khách/i }));

    expect(mockedCreatePublicBooking).not.toHaveBeenCalled();
  });
});
