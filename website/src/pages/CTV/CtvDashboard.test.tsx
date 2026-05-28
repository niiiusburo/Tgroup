import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import i18n from '@/i18n';
import CtvDashboard from './CtvDashboard';
import type { CtvHierarchyResponse, CtvReferralResponse } from '@/lib/api/ctv';

const ctvResourcePatch = {
  en: {
    actions: { trackClients: 'Referred clients', inviteCtv: 'Invite CTVs' },
    tabs: {
      home: 'Home',
      commission: 'Commission',
      referrals: 'Track Clients',
      network: 'Network',
      me: 'Me',
    },
    home: {
      greeting: 'Hi, {{name}}',
      subtitle: 'Your referral commission across Dental & Cosmetic',
      pendingCommission: 'Pending commission',
      thisMonth: 'This month',
      services: 'Services',
      paidOut: 'Paid out',
      recentActivity: 'Recent activity',
      noActivityPlain: 'No recent activity yet.',
    },
    commission: {
      myCommission: 'My commission',
      pending: 'Pending',
      paid: 'Paid',
      totalPending: 'Total pending',
      totalPaid: 'Total paid',
      noPending: 'No pending commission yet.',
      noPayouts: 'No paid payouts yet.',
    },
    header: { meTitle: 'Account' },
    me: {
      ctvPartner: 'CTV Partner',
      referralCode: 'Referral code',
      language: 'Language',
      notifications: 'Notifications',
      on: 'On',
      copyCodeHint: 'Use this code when linking clients or CTVs.',
    },
  },
  vi: {
    actions: { trackClients: 'Khách giới thiệu', inviteCtv: 'Giới thiệu CTV' },
    tabs: {
      home: 'Tổng quan',
      commission: 'Hoa hồng',
      referrals: 'Theo dõi',
      network: 'Mạng lưới',
      me: 'Tôi',
    },
    home: {
      greeting: 'Xin chào, {{name}}',
      subtitle: 'Hoa hồng giới thiệu của bạn qua Dental & Cosmetic',
      pendingCommission: 'Hoa hồng chờ nhận',
      thisMonth: 'Tháng này',
      services: 'Dịch vụ',
      paidOut: 'Đã nhận',
      recentActivity: 'Hoạt động gần đây',
      noActivityPlain: 'Chưa có hoạt động gần đây.',
    },
    commission: {
      myCommission: 'Hoa hồng của tôi',
      pending: 'Chờ nhận',
      paid: 'Đã nhận',
      totalPending: 'Tổng chờ nhận',
      totalPaid: 'Tổng đã nhận',
      noPending: 'Chưa có hoa hồng chờ nhận.',
      noPayouts: 'Chưa có khoản đã chi trả.',
    },
    header: { meTitle: 'Tài khoản' },
    me: {
      ctvPartner: 'Đối tác CTV',
      referralCode: 'Mã giới thiệu',
      language: 'Ngôn ngữ',
      notifications: 'Thông báo',
      on: 'Bật',
      copyCodeHint: 'Dùng mã này khi gắn khách hoặc CTV.',
    },
  },
};

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
    recent: [
      {
        id: 'earning-1',
        client_name: 'Seed Client - NK3 CTV',
        service_name: 'Botox gọn hàm',
        amount: 72000,
        source: 'ctv',
        lob: 'cosmetic',
        earned_at: '2026-05-24T10:00:00.000Z',
        status: 'pending',
      },
    ],
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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'ctv-1', name: 'CTV Demo', email: 'ctv-demo@clinic.vn', is_ctv: true },
    logout: vi.fn(),
  }),
}));

describe('CtvDashboard', () => {
  afterEach(() => {
    localStorage.setItem('tg-lang', 'vi');
    void i18n.changeLanguage('vi');
  });

  function loadCtvResources() {
    i18n.addResourceBundle('en', 'ctv', ctvResourcePatch.en, true, true);
    i18n.addResourceBundle('vi', 'ctv', ctvResourcePatch.vi, true, true);
  }

  async function prepareCtvLanguage(lang: 'en' | 'vi') {
    if (!i18n.isInitialized) {
      await new Promise<void>((resolve) => {
        i18n.on('initialized', () => resolve());
      });
    }
    loadCtvResources();
    localStorage.setItem('tg-lang', lang);
    await i18n.changeLanguage(lang);
  }

  it('renders one canonical bottom-menu portal shell in English', async () => {
    await prepareCtvLanguage('en');
    render(<CtvDashboard />);

    await waitFor(() => expect(screen.getAllByText('Hi, CTV Demo')[0]).toBeVisible());

    expect(screen.getAllByText('CTV Portal')[0]).toBeVisible();
    expect(screen.getByRole('button', { name: /notifications/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /referred clients/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /invite ctvs/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /^home$/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /commission/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /track clients/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /^network$/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /^me$/i })).toBeVisible();
  });

  it('keeps tracking on one bottom Theo dõi label and searches accent-insensitively', async () => {
    await prepareCtvLanguage('vi');
    const user = userEvent.setup();
    render(<CtvDashboard />);

    await waitFor(() => expect(screen.getAllByText('Xin chào, CTV Demo')[0]).toBeVisible());

    expect(screen.getAllByRole('button', { name: /^theo dõi$/i })).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /^theo dõi$/i }));
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

  it('opens the CTV hierarchy tab with upline and downline CTVs separated from client tracking', async () => {
    await prepareCtvLanguage('vi');
    const user = userEvent.setup();
    render(<CtvDashboard />);

    await waitFor(() => expect(screen.getAllByText('Xin chào, CTV Demo')[0]).toBeVisible());

    await waitFor(() => expect(screen.getByRole('button', { name: /giới thiệu ctv/i })).toBeVisible());
    await user.click(screen.getByRole('button', { name: /giới thiệu ctv/i }));

    await waitFor(() => expect(screen.getAllByText('Hệ thống giới thiệu CTV')[0]).toBeVisible());
    expect(screen.getAllByText('Tuyến trên')[0]).toBeVisible();
    expect(screen.getByText('Leader CTV')).toBeVisible();
    expect(screen.getAllByText('Tuyến dưới')[0]).toBeVisible();
    expect(screen.getByText('Junior CTV')).toBeVisible();
    expect(screen.queryByRole('searchbox', { name: /tìm khách giới thiệu/i })).not.toBeInTheDocument();
  });

  it('opens the LanguageToggle dropdown below the CTV header', async () => {
    await prepareCtvLanguage('en');
    const user = userEvent.setup();
    render(<CtvDashboard />);

    await waitFor(() => expect(screen.getAllByText('Hi, CTV Demo')[0]).toBeVisible());

    await user.click(screen.getByRole('button', { name: /switch language/i }));

    const dropdown = screen.getByTestId('lang-dropdown');
    expect(dropdown).toBeVisible();
    expect(dropdown).toHaveClass('top-full');
    expect(dropdown).not.toHaveClass('bottom-full');
    expect(screen.getByRole('button', { name: /tiếng việt/i })).toBeVisible();
  });
});
