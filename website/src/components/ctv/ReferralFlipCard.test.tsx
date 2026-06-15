import '@/i18n';
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
    expect(screen.getAllByText('Aesthetic').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3 services/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Expected').length).toBeGreaterThan(0);

    await user.click(flipButton);

    expect(screen.getByText('Your commission lines for this client')).toBeVisible();
    expect(screen.getByText('Dental')).toBeVisible();
    expect(screen.getByRole('button', { name: /Back/i })).toBeVisible();
  });

  it('keeps the card flipped while commission focus is active', async () => {
    localStorage.setItem('tg-lang', 'en');
    const user = userEvent.setup();
    render(
      <ReferralFlipCard
        referral={referral}
        initialFlipped
        focus={{
          clientId: 'client-1',
          serviceLineId: 'line-2',
          serviceName: 'Laser da mặt',
        }}
      />
    );

    const flipButton = screen.getByRole('button', {
      name: /show client tracking journey for seed client - nk3 ctv/i,
    });
    expect(flipButton).toHaveAttribute('aria-expanded', 'true');
    await user.click(flipButton);
    expect(flipButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Laser da mặt')).toBeVisible();
  });

  it('starts flipped and highlights the focused commission service row', () => {
    localStorage.setItem('tg-lang', 'en');
    render(
      <ReferralFlipCard
        referral={referral}
        initialFlipped
        focus={{
          clientId: 'client-1',
          serviceLineId: 'line-2',
          serviceName: 'Laser da mặt',
        }}
      />
    );

    expect(
      screen.getByRole('button', { name: /show client tracking journey for seed client - nk3 ctv/i })
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Laser da mặt').closest('li')?.className).toMatch(/ring-orange-300/);
  });

  it('renders independent link bars per LOB when lob_links differ', () => {
    localStorage.setItem('tg-lang', 'en');
    const dualLob: CtvReferral = {
      id: 'client-dual',
      name: 'Dual LOB Client',
      phone: '0900000099',
      lobs: ['dental', 'cosmetic'],
      total_earned: 0,
      earned_count: 0,
      service_count: 1,
      status: 'earning',
      referred_at: '2026-06-01T08:00:00.000Z',
      services: [],
      lob_links: {
        dental: {
          lob: 'dental',
          link_expires_at: '2026-12-01T00:00:00.000Z',
          link_anchor_at: '2026-06-01T00:00:00.000Z',
          link_active: true,
          eligible: false,
          linked_ctv_name: 'CTV Dental',
        },
        cosmetic: {
          lob: 'cosmetic',
          link_expires_at: null,
          link_anchor_at: null,
          link_active: false,
          eligible: true,
          linked_ctv_name: null,
        },
      },
    };
    render(<ReferralFlipCard referral={dualLob} />);

    expect(screen.getByTestId('ctv-eligible-banner-cosmetic')).toBeVisible();
    expect(screen.queryByTestId('ctv-eligible-banner-dental')).not.toBeInTheDocument();
    expect(screen.getAllByText('Dental').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Aesthetic').length).toBeGreaterThan(0);
  });

  it('highlights the focused LOB link section when focus.lob is set', () => {
    localStorage.setItem('tg-lang', 'en');
    const dualLob: CtvReferral = {
      id: 'client-dual',
      name: 'Dual LOB Client',
      phone: '0900000099',
      lobs: ['dental', 'cosmetic'],
      total_earned: 0,
      earned_count: 0,
      service_count: 0,
      status: 'earning',
      referred_at: '2026-06-01T08:00:00.000Z',
      services: [],
      lob_links: {
        dental: {
          lob: 'dental',
          link_expires_at: '2026-12-01T00:00:00.000Z',
          link_anchor_at: '2026-06-01T00:00:00.000Z',
          link_active: true,
          eligible: false,
          linked_ctv_name: 'CTV Dental',
          stage_progress: 2,
        },
        cosmetic: {
          lob: 'cosmetic',
          link_expires_at: null,
          link_anchor_at: null,
          link_active: false,
          eligible: true,
          linked_ctv_name: null,
          stage_progress: 4,
        },
      },
    };

    render(
      <ReferralFlipCard
        referral={dualLob}
        focus={{
          clientId: 'client-dual',
          lob: 'dental',
        }}
      />
    );

    const dentalSection = screen.getByTestId('ctv-lob-link-dental');
    expect(dentalSection.className).toMatch(/ring-orange/);
    expect(screen.getByTestId('ctv-lob-link-cosmetic').className).not.toMatch(/ring-orange-300/);
    expect(screen.getByText('2/4')).toBeVisible();
  });

  it('uses per-LOB stage_progress for dual-LOB referrals when focus LOB is absent', () => {
    localStorage.setItem('tg-lang', 'en');
    const dualLob: CtvReferral = {
      id: 'client-dual',
      name: 'Dual LOB Client',
      phone: '0900000099',
      lobs: ['dental', 'cosmetic'],
      total_earned: 0,
      earned_count: 0,
      service_count: 0,
      status: 'earning',
      referred_at: '2026-06-01T08:00:00.000Z',
      services: [],
      stage_progress: 1,
      lob_links: {
        dental: {
          lob: 'dental',
          link_expires_at: '2026-12-01T00:00:00.000Z',
          link_anchor_at: '2026-06-01T00:00:00.000Z',
          link_active: true,
          eligible: false,
          linked_ctv_name: 'CTV Dental',
          stage_progress: 2,
        },
        cosmetic: {
          lob: 'cosmetic',
          link_expires_at: '2026-12-01T00:00:00.000Z',
          link_anchor_at: '2026-06-01T00:00:00.000Z',
          link_active: true,
          eligible: false,
          linked_ctv_name: 'CTV Cosmetic',
          stage_progress: 4,
        },
      },
    };

    render(<ReferralFlipCard referral={dualLob} />);

    expect(screen.getByText('4/4')).toBeVisible();
  });

  it('shows 4/4 from server stage_progress for a paid client with no service lines (regression: was stuck at 1/4)', () => {
    localStorage.setItem('tg-lang', 'vi');
    const paidNoServices: CtvReferral = {
      id: 'client-paid',
      name: 'Đặng Thị Tuyết Mai',
      phone: '0900000001',
      lobs: ['dental'],
      total_earned: 0,
      earned_count: 0,
      service_count: 0,
      status: 'paid',
      referred_at: '2026-05-17T08:00:00.000Z',
      services: [],
      stage: 'paid',
      stage_progress: 4,
    };
    render(<ReferralFlipCard referral={paidNoServices} />);
    // The journey ring reflects the real payment (4/4) even though no commission/service row exists.
    expect(screen.getByText('4/4')).toBeVisible();
  });
});
