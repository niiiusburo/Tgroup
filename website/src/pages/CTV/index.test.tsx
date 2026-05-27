import '@/i18n';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CtvDashboard } from './index';
import type { CtvReferralResponse } from '@/lib/api/ctv';

const referralsResponse: CtvReferralResponse = {
  referrals: [
    {
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
      ],
    },
    {
      id: 'client-2',
      name: 'Thuần Lê',
      phone: '0911111111',
      lobs: ['dental'],
      total_earned: 0,
      earned_count: 0,
      service_count: 0,
      status: 'no visit yet',
      referred_at: '2026-05-22T08:00:00.000Z',
      services: [],
    },
  ],
};

vi.mock('@/lib/api', () => ({
  fetchCtvReferrals: vi.fn(async () => referralsResponse),
  fetchCtvCommissionSummary: vi.fn(async () => ({
    totals: { pending: 172000, paid: 0, dentalPending: 0, cosmeticPending: 172000 },
    counts: { pending: 3, paid: 0 },
    recent: [],
    pendingList: [],
    paidList: [],
  })),
  fetchCtvProfile: vi.fn(async () => ({
    id: 'ctv-1',
    name: 'CTV Demo',
    email: 'ctv-demo@clinic.vn',
    phone: '',
    role: 'CTV',
  })),
}));

describe('CtvDashboard', () => {
  afterEach(() => {
    localStorage.setItem('tg-lang', 'vi');
  });

  it('loads referrals, filters accent-insensitively, and opens service rows from a flip card', async () => {
    localStorage.setItem('tg-lang', 'vi');
    const user = userEvent.setup();
    render(<CtvDashboard />);

    await waitFor(() => {
      expect(screen.getAllByText('Seed Client - NK3 CTV')[0]).toBeVisible();
      expect(screen.getAllByText('Thuần Lê')[0]).toBeVisible();
    });

    const searchBox = screen.getByRole('searchbox', { name: /tìm khách hàng/i });
    await user.type(searchBox, 'thuan');

    expect(screen.queryByText('Seed Client - NK3 CTV')).not.toBeInTheDocument();
    expect(screen.getAllByText('Thuần Lê')[0]).toBeVisible();

    await user.clear(searchBox);
    await user.click(screen.getByRole('button', { name: /Seed Client - NK3 CTV/i }));

    expect(screen.getByText('Botox gọn hàm')).toBeVisible();
  });

  it('renders the CTV portal shell in English when the app language is English', async () => {
    localStorage.setItem('tg-lang', 'en');
    render(<CtvDashboard />);

    await waitFor(() => expect(screen.getByText('Customer Tracking')).toBeVisible());

    expect(screen.getByText('CTV Portal')).toBeVisible();
    expect(screen.getByRole('button', { name: /notifications/i })).toBeVisible();
    expect(screen.getByRole('searchbox', { name: /search customers/i })).toBeVisible();
    expect(screen.getByText('Refer Client')).toBeVisible();
  });
});
