import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '@/i18n';
import { CtvReferModal } from './CtvReferModal';
import { createBooking, fetchCtvServices, lookupClientByPhone } from '@/lib/api/ctv';

vi.mock('@/lib/api/ctv', () => ({
  createBooking: vi.fn(),
  fetchCtvServices: vi.fn(),
  lookupClientByPhone: vi.fn(),
}));

const mockedCreateBooking = vi.mocked(createBooking);
const mockedFetchCtvServices = vi.mocked(fetchCtvServices);
const mockedLookupClientByPhone = vi.mocked(lookupClientByPhone);

describe('CtvReferModal', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
    mockedCreateBooking.mockResolvedValue({ clientId: 'client-1', appointmentId: 'appt-1' });
    mockedFetchCtvServices.mockResolvedValue({ services: [] });
    mockedLookupClientByPhone.mockResolvedValue({ exists: false, lob: 'cosmetic' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('prefills the appointment date with today in Vietnam time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T18:30:00.000Z'));
    const { container } = render(<CtvReferModal open onClose={vi.fn()} onSuccess={vi.fn()} />);

    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;

    expect(dateInput).toHaveValue('2026-06-01');
  });

  it('submits a booking without requiring the CTV to manually pick today', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-31T18:30:00.000Z'));
    const { container } = render(<CtvReferModal open onClose={vi.fn()} onSuccess={vi.fn()} />);
    vi.useRealTimers();
    const [nameInput, phoneInput] = Array.from(container.querySelectorAll('input')) as HTMLInputElement[];

    fireEvent.change(nameInput, { target: { value: 'thuan test' } });
    fireEvent.change(phoneInput, { target: { value: '0123123123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cosmetic' }));
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
    const { container } = render(<CtvReferModal open onClose={vi.fn()} onSuccess={vi.fn()} />);
    const [nameInput, phoneInput] = Array.from(container.querySelectorAll('input')) as HTMLInputElement[];

    fireEvent.click(screen.getByRole('button', { name: 'Cosmetic' }));
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
    const { container } = render(<CtvReferModal open onClose={vi.fn()} onSuccess={vi.fn()} />);
    const [nameInput, phoneInput] = Array.from(container.querySelectorAll('input')) as HTMLInputElement[];

    fireEvent.click(screen.getByRole('button', { name: 'Cosmetic' }));
    fireEvent.change(phoneInput, { target: { value: '0999888777' } });

    await waitFor(() => expect(mockedLookupClientByPhone).toHaveBeenCalledWith('0999888777', 'cosmetic'));
    expect(nameInput).toHaveValue('');
  });
});
