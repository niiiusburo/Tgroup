import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ReferralFlipCard } from './ReferralFlipCard';
import type { CtvReferral } from '@/lib/api/ctv';

const referral: CtvReferral = {
  id: 'client-1',
  name: 'Seed Client - NK3 CTV',
  phone: '0900000000',
  lobs: ['cosmetic'],
  total_earned: 172000,
  earned_count: 3,
  service_count: 3,
  status: 'earning',
  referred_at: '2026-05-24T08:00:00.000Z',
  services: [
    {
      id: 'earning-1',
      serviceLineId: 'line-1',
      serviceName: 'Botox gọn hàm',
      amount: 72000,
      status: 'pending',
      lob: 'cosmetic',
      source: 'ctv',
      earnedAt: '2026-05-24T10:00:00.000Z',
      paymentId: 'payment-1',
    },
    {
      id: 'earning-2',
      serviceLineId: 'line-2',
      serviceName: 'Laser da mặt',
      amount: 48000,
      status: 'pending',
      lob: 'cosmetic',
      source: 'ctv',
      earnedAt: '2026-05-25T10:00:00.000Z',
      paymentId: 'payment-2',
    },
    {
      id: 'earning-3',
      serviceLineId: 'line-3',
      serviceName: 'Tẩy trắng răng',
      amount: 52000,
      status: 'paid',
      lob: 'dental',
      source: 'ctv',
      earnedAt: '2026-05-26T10:00:00.000Z',
      paymentId: 'payment-3',
    },
  ],
};

describe('ReferralFlipCard', () => {
  afterEach(() => {
    localStorage.setItem('tg-lang', 'vi');
  });

  it('flips from referral journey to all service rows for the client', async () => {
    localStorage.setItem('tg-lang', 'vi');
    const user = userEvent.setup();
    render(<ReferralFlipCard referral={referral} />);

    const flipButton = screen.getByRole('button', { name: /Seed Client - NK3 CTV/i });
    expect(flipButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('3/4')).toBeVisible();
    expect(screen.getAllByText(/3 dịch vụ/i).length).toBeGreaterThan(0);

    await user.click(flipButton);

    expect(flipButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Botox gọn hàm')).toBeVisible();
    expect(screen.getByText('Laser da mặt')).toBeVisible();
    expect(screen.getByText('Tẩy trắng răng')).toBeVisible();
    expect(screen.getAllByText('172.000 ₫').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /Quay lại/i }));

    expect(flipButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('3/4')).toBeVisible();
  });

  it('renders referral portal copy in English when the app language is English', async () => {
    localStorage.setItem('tg-lang', 'en');
    const user = userEvent.setup();
    render(<ReferralFlipCard referral={referral} />);

    const flipButton = screen.getByRole('button', { name: /show services for Seed Client - NK3 CTV/i });
    expect(screen.getAllByText('Cosmetic').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3 services/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Expected').length).toBeGreaterThan(0);

    await user.click(flipButton);

    expect(screen.getByText('Services under this referral')).toBeVisible();
    expect(screen.getByText('Dental')).toBeVisible();
    expect(screen.getByRole('button', { name: /Back/i })).toBeVisible();
  });
});
