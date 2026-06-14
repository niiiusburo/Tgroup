import '@/i18n';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CtvTrackingTab } from './CtvTrackingTab';
import type { CtvReferral } from '@/lib/api/ctv';

const referrals: CtvReferral[] = [
  {
    id: 'client-1',
    name: 'Seed Client NK3 CTV',
    phone: '0900000000',
    lobs: ['cosmetic'],
    total_earned: 72700,
    earned_count: 1,
    service_count: 0,
    status: 'earning',
    referred_at: '2026-05-24T08:00:00.000Z',
    services: [],
  },
];

describe('CtvTrackingTab focus handoff', () => {
  it('prefills search, flips the card, and highlights the commission service row', () => {
    localStorage.setItem('tg-lang', 'en');
    render(
      <CtvTrackingTab
        referrals={referrals}
        isLoading={false}
        error={null}
        onRetry={() => undefined}
        focus={{
          clientId: 'client-1',
          clientName: 'Seed Client NK3 CTV',
          serviceLineId: 'line-9',
          serviceName: '1cc Filler Hàn',
          lob: 'cosmetic',
          amount: 72700,
          status: 'reversed',
        }}
      />
    );

    expect(screen.getByRole('searchbox', { name: /search referred clients/i })).toHaveValue(
      'Seed Client NK3 CTV'
    );
    expect(screen.getByText('1cc Filler Hàn')).toBeVisible();
    expect(screen.getByText('Card flipped to show the service under this client.')).toBeVisible();
    expect(
      screen.getByRole('button', { name: /show client tracking journey for seed client nk3 ctv/i })
    ).toHaveAttribute('aria-expanded', 'true');
  });
});