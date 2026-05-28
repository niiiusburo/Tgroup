import '@/i18n';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CtvDashboard } from './index';
import type { CtvHierarchyResponse, CtvReferralResponse } from '@/lib/api/ctv';

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

const hierarchyResponse: CtvHierarchyResponse = {
  current: {
    id: 'ctv-1',
    name: 'CTV Demo',
    email: 'ctv-demo@clinic.vn',
    phone: '',
    joinedAt: '2026-05-20T00:00:00.000Z',
    referredByCtvId: 'ctv-parent',
    level: 0,
    directDownlineCount: 1,
    lobs: ['dental'],
  },
  upline: [
    {
      id: 'ctv-parent',
      name: 'Leader CTV',
      email: 'leader@clinic.vn',
      phone: '0909999999',
      joinedAt: '2026-05-01T00:00:00.000Z',
      referredByCtvId: null,
      level: 1,
      directDownlineCount: 2,
      lobs: ['dental'],
    },
  ],
  downline: [
    {
      id: 'ctv-child',
      name: 'Junior CTV',
      email: 'junior@clinic.vn',
      phone: '0902222222',
      joinedAt: '2026-05-25T00:00:00.000Z',
      referredByCtvId: 'ctv-1',
      level: 1,
      directDownlineCount: 0,
      lobs: ['dental'],
    },
  ],
  totals: { uplineCount: 1, downlineCount: 1, directDownlineCount: 1 },
};

vi.mock('@/lib/api', () => ({
  fetchCtvReferrals: vi.fn(async () => referralsResponse),
  fetchCtvHierarchy: vi.fn(async () => hierarchyResponse),
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

    const searchBox = screen.getByRole('searchbox', { name: /tìm khách giới thiệu/i });
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

    await waitFor(() => expect(screen.getByText('Referred Client Tracking')).toBeVisible());

    expect(screen.getByText('CTV Portal')).toBeVisible();
    expect(screen.getByRole('button', { name: /notifications/i })).toBeVisible();
    expect(screen.getByRole('searchbox', { name: /search referred clients/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /track clients/i })).toBeVisible();
    expect(screen.getByText('Invite CTVs')).toBeVisible();
  });

  it('opens the CTV hierarchy tab with upline and downline CTVs separated from client tracking', async () => {
    localStorage.setItem('tg-lang', 'vi');
    const user = userEvent.setup();
    render(<CtvDashboard />);

    await waitFor(() => expect(screen.getByText('Theo dõi khách giới thiệu')).toBeVisible());

    await user.click(screen.getByRole('button', { name: /giới thiệu ctv/i }));

    await waitFor(() => expect(screen.getByText('Hệ thống giới thiệu CTV')).toBeVisible());
    expect(screen.getAllByText('Tuyến trên')[0]).toBeVisible();
    expect(screen.getByText('Leader CTV')).toBeVisible();
    expect(screen.getAllByText('Tuyến dưới')[0]).toBeVisible();
    expect(screen.getByText('Junior CTV')).toBeVisible();
    expect(screen.queryByRole('searchbox', { name: /tìm khách giới thiệu/i })).not.toBeInTheDocument();
  });

  it('renders the LanguageToggle button in the header', async () => {
    localStorage.setItem('tg-lang', 'en');
    render(<CtvDashboard />);

    await waitFor(() => expect(screen.getByText('Referred Client Tracking')).toBeVisible());

    expect(screen.getByRole('button', { name: /switch language/i })).toBeVisible();
  });
});
