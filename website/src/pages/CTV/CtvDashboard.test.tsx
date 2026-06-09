import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/test-utils';
import CtvDashboard from './CtvDashboard';
import { changeCtvSelfPassword, updateCtvSelfProfile } from '@/lib/api';
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

vi.mock('qrcode', () => ({
  default: {
    toCanvas: vi.fn().mockResolvedValue(undefined),
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,test'),
  },
}));

vi.mock('@/lib/api', () => ({
  fetchMe: vi.fn(async () => ({
    user: {
      id: 'ctv-1',
      name: 'CTV Demo',
      email: 'ctv-demo@clinic.vn',
      companyId: 'company-1',
      companyName: 'TG Clinic',
      is_ctv: true,
    },
    permissions: {
      groupId: '',
      groupName: 'CTV',
      effectivePermissions: [],
      locations: [],
    },
  })),
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
  updateCtvSelfProfile: vi.fn(async () => ({
    id: 'ctv-1',
    name: 'CTV Demo Updated',
    email: 'ctv-demo@clinic.vn',
    phone: '',
    role: 'CTV',
  })),
  changeCtvSelfPassword: vi.fn(async () => ({ success: true })),
}));

const mockUpdateCtvSelfProfile = vi.mocked(updateCtvSelfProfile);
const mockChangeCtvSelfPassword = vi.mocked(changeCtvSelfPassword);

describe('CtvDashboard', () => {
  beforeAll(async () => {
    // Ensure i18n is initialized before any tests run
    if (!i18n.isInitialized) {
      await new Promise<void>((resolve) => {
        i18n.on('initialized', () => resolve());
      });
    }
  });

  afterEach(() => {
    localStorage.clear();
    localStorage.setItem('tg-lang', 'vi');
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    void i18n.changeLanguage('vi');
    mockUpdateCtvSelfProfile.mockClear();
    mockChangeCtvSelfPassword.mockClear();
  });

  async function prepareCtvLanguage(lang: 'en' | 'vi') {
    localStorage.setItem('tg-lang', lang);
    await i18n.changeLanguage(lang);
  }

  function setScrollY(value: number) {
    Object.defineProperty(window, 'scrollY', { configurable: true, value });
  }

  it('renders one canonical bottom-menu portal shell in English', async () => {
    await prepareCtvLanguage('en');
    localStorage.setItem('tgclinic_token', 'test-token');
    renderWithProviders(<CtvDashboard />);

    await waitFor(() => expect(screen.getAllByText('Hi, CTV Demo')[0]).toBeVisible());

    expect(screen.getAllByText('CTV Portal')[0]).toBeVisible();
    expect(screen.getByRole('button', { name: /notifications/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /refer a client/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /recruit ctv/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /^home$/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /commission/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /track clients/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /referral\/qr/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /^me$/i })).toBeVisible();
  });

  it('renders a compact pill action menu and reveals the motion header when scrolling up', async () => {
    await prepareCtvLanguage('en');
    localStorage.setItem('tgclinic_token', 'test-token');
    setScrollY(0);
    renderWithProviders(<CtvDashboard />);

    await waitFor(() => expect(screen.getAllByText('Hi, CTV Demo')[0]).toBeVisible());

    const header = screen.getByTestId('ctv-motion-header');
    expect(header).toHaveAttribute('data-scroll-state', 'visible');
    expect(header.parentElement).toHaveClass('sticky');
    expect(screen.getByRole('group', { name: /quick ctv actions/i })).toHaveClass('rounded-full');

    setScrollY(140);
    fireEvent.scroll(window);
    await waitFor(() => expect(header).toHaveAttribute('data-scroll-state', 'hidden'));

    setScrollY(72);
    fireEvent.scroll(window);
    await waitFor(() => expect(header).toHaveAttribute('data-scroll-state', 'visible'));
  });

  it('shows a shareable CTV invite link on the Me tab and copies the full join URL', async () => {
    await prepareCtvLanguage('vi');
    localStorage.setItem('tgclinic_token', 'test-token');
    const writeText = vi.fn(async () => undefined);
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    renderWithProviders(<CtvDashboard />);

    await waitFor(() => expect(screen.getAllByText('Xin chào, CTV Demo')[0]).toBeVisible());
    await user.click(screen.getByRole('button', { name: /^tôi$/i }));

    expect(screen.getByText('Liên kết mời CTV')).toBeVisible();
    const inviteLinkText = screen.getByText(/\/ctv\/join\?ref=CTV-/i);
    const inviteLink = inviteLinkText.closest('a');
    expect(inviteLink).not.toBeNull();
    const href = inviteLink?.getAttribute('href');
    expect(href).toContain('/ctv/join?ref=CTV-');

    await user.click(screen.getByRole('button', { name: /sao chép liên kết mời ctv/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(href));
    await waitFor(() => expect(screen.getByText('Đã sao chép liên kết')).toBeVisible());
  });

  it('keeps tracking on one bottom Theo dõi label and searches accent-insensitively', async () => {
    await prepareCtvLanguage('vi');
    localStorage.setItem('tgclinic_token', 'test-token');
    const user = userEvent.setup();
    renderWithProviders(<CtvDashboard />);

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
    localStorage.setItem('tgclinic_token', 'test-token');
    const user = userEvent.setup();
    renderWithProviders(<CtvDashboard />);

    await waitFor(() => expect(screen.getAllByText('Xin chào, CTV Demo')[0]).toBeVisible());

    await waitFor(() => expect(screen.getByRole('button', { name: /giới thiệu\/qr/i })).toBeVisible());
    await user.click(screen.getByRole('button', { name: /giới thiệu\/qr/i }));

    await waitFor(() => expect(screen.getAllByText('Giới thiệu & mã QR')[0]).toBeVisible());
    await user.click(screen.getByRole('tab', { name: /mạng lưới/i }));

    await waitFor(() => expect(screen.getAllByText('Tuyến trên')[0]).toBeVisible());
    expect(screen.getAllByText('Tuyến trên')[0]).toBeVisible();
    expect(screen.getByText('Leader CTV')).toBeVisible();
    expect(screen.getAllByText('Tuyến dưới')[0]).toBeVisible();
    expect(screen.getByText('Junior CTV')).toBeVisible();
    expect(screen.queryByRole('searchbox', { name: /tìm khách giới thiệu/i })).not.toBeInTheDocument();
  });

  it('shows the QR discount sub-tab with share link and download actions', async () => {
    await prepareCtvLanguage('vi');
    localStorage.setItem('tgclinic_token', 'test-token');
    const user = userEvent.setup();
    renderWithProviders(<CtvDashboard />);

    await waitFor(() => expect(screen.getAllByText('Xin chào, CTV Demo')[0]).toBeVisible());

    await user.click(screen.getByRole('button', { name: /giới thiệu\/qr/i }));
    await waitFor(() => expect(screen.getAllByText('Giới thiệu & mã QR')[0]).toBeVisible());

    await user.click(screen.getByRole('tab', { name: /mã qr/i }));

    await waitFor(() => expect(screen.getByText('Cách 1 — Gửi link')).toBeVisible());
    expect(screen.getByText('Cách 2 — Tải ảnh QR')).toBeVisible();
    expect(screen.getByText(/\/ctv\/discount\/CTV-/i)).toBeVisible();
    expect(screen.getByRole('link', { name: /mở thử link/i })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/ctv\/discount\/CTV-/)
    );
    expect(screen.getByRole('button', { name: /tạo mã & tải ảnh/i })).toBeVisible();
  });

  it('shows a prominent pricing button on the CTV home overview', async () => {
    await prepareCtvLanguage('en');
    localStorage.setItem('tgclinic_token', 'test-token');
    renderWithProviders(<CtvDashboard />);

    await waitFor(() => expect(screen.getAllByText('Hi, CTV Demo')[0]).toBeVisible());

    const pricingCta = screen.getByRole('link', { name: /view service pricing/i });
    expect(pricingCta).toHaveAttribute('href', '/bang-gia');
    expect(pricingCta.className).toMatch(/py-4/);
  });

  it('shows legacy catalog and pricing links beside the language toggle', async () => {
    await prepareCtvLanguage('en');
    localStorage.setItem('tgclinic_token', 'test-token');
    renderWithProviders(<CtvDashboard />);

    await waitFor(() => expect(screen.getAllByText('Hi, CTV Demo')[0]).toBeVisible());

    const catalogLink = screen.getByRole('link', { name: /service catalog/i });
    expect(catalogLink).toHaveAttribute('href', '/catalogue');

    const pricingLink = screen.getByRole('link', { name: /^service pricing$/i });
    expect(pricingLink).toHaveAttribute('href', '/bang-gia');
  });

  it('opens the LanguageToggle dropdown below the CTV header', async () => {
    await prepareCtvLanguage('en');
    localStorage.setItem('tgclinic_token', 'test-token');
    const user = userEvent.setup();
    renderWithProviders(<CtvDashboard />);

    await waitFor(() => expect(screen.getAllByText('Hi, CTV Demo')[0]).toBeVisible());

    await user.click(screen.getByRole('button', { name: /switch language/i }));

    const dropdown = screen.getByTestId('lang-dropdown');
    expect(dropdown).toBeVisible();
    expect(dropdown).toHaveClass('top-full');
    expect(dropdown).not.toHaveClass('bottom-full');
    expect(screen.getByRole('button', { name: /tiếng việt/i })).toBeVisible();
  });

  it('lets a CTV update their name and password from the Tôi tab', async () => {
    await prepareCtvLanguage('vi');
    localStorage.setItem('tgclinic_token', 'test-token');
    const user = userEvent.setup();
    renderWithProviders(<CtvDashboard />);

    await waitFor(() => expect(screen.getAllByText('Xin chào, CTV Demo')[0]).toBeVisible());

    await user.click(screen.getByRole('button', { name: /^tôi$/i }));
    expect(screen.getByTestId('ctv-motion-header').parentElement).toHaveClass('relative');
    const nameInput = screen.getByLabelText('Tên hiển thị');
    await user.clear(nameInput);
    await user.type(nameInput, 'CTV Demo Updated');
    await user.click(screen.getByRole('button', { name: /lưu tên/i }));

    await waitFor(() => expect(mockUpdateCtvSelfProfile).toHaveBeenCalledWith({ name: 'CTV Demo Updated' }));
    expect(screen.getAllByText('CTV Demo Updated')[0]).toBeVisible();
    expect(screen.getByText('Đã cập nhật tên.')).toBeVisible();

    await user.type(screen.getByLabelText('Mật khẩu hiện tại'), 'old-secret');
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'new-secret');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'new-secret');
    await user.click(screen.getByRole('button', { name: /đổi mật khẩu/i }));

    await waitFor(() => expect(mockChangeCtvSelfPassword).toHaveBeenCalledWith({
      currentPassword: 'old-secret',
      newPassword: 'new-secret',
    }));
    expect(screen.getByText('Đã đổi mật khẩu.')).toBeVisible();
  });
});
