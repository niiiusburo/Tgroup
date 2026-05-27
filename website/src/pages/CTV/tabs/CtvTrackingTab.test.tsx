import '@/i18n';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { CtvTrackingTab } from './CtvTrackingTab';
import type { CtvReferral } from '@/lib/api/ctv';
import i18n from '@/i18n';

const referrals: CtvReferral[] = [
  {
    id: 'client-1',
    name: 'Seed Client - TMV CTV',
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
];

describe('CtvTrackingTab', () => {
  afterEach(() => {
    localStorage.setItem('tg-lang', 'vi');
  });

  it('filters accent-insensitively and flips referral cards to reveal services', async () => {
    localStorage.setItem('tg-lang', 'vi');
    await i18n.changeLanguage('vi');
    const user = userEvent.setup();

    render(
      <CtvTrackingTab
        clients={[]}
        referrals={referrals}
        loading={false}
        onReferClient={() => undefined}
      />
    );

    expect(screen.getAllByText('Seed Client - TMV CTV')[0]).toBeVisible();
    expect(screen.getAllByText('Thuần Lê')[0]).toBeVisible();

    const searchBox = await screen.findByRole('textbox');
    await user.type(searchBox, 'thuan');

    expect(screen.queryByText('Seed Client - TMV CTV')).not.toBeInTheDocument();
    expect(screen.getAllByText('Thuần Lê')[0]).toBeVisible();

    await user.clear(searchBox);
    await user.click(screen.getByRole('button', { name: /Seed Client - TMV CTV/i }));

    expect(screen.getByText('Botox gọn hàm')).toBeVisible();
    expect(screen.getByText('72.000 ₫')).toBeVisible();
  });
});
