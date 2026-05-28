import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CtvTrackingTab } from './CtvTrackingTab';
import type { CtvClientJourney } from '@/lib/api/ctv';

const clients: CtvClientJourney[] = [
  {
    id: 'client-1',
    name: 'Seed Client',
    phone: '0900000001',
    lobs: ['cosmetic'],
    referred_at: '2026-05-24T08:00:00.000Z',
    stage: 'referred',
    stage_progress: 1,
    total_earned: 0,
  },
  {
    id: 'client-2',
    name: 'Thuần Lê',
    phone: '0900000002',
    lobs: ['dental'],
    referred_at: '2026-05-24T08:00:00.000Z',
    stage: 'serviced',
    stage_progress: 3,
    service: {
      name: 'Tẩy trắng răng',
      amount: 1200000,
      date: '2026-05-25T08:00:00.000Z',
    },
    total_earned: 120000,
    estimated_commission: 120000,
  },
];

describe('CtvTrackingTab search', () => {
  it('matches Vietnamese client and service text without requiring accents', async () => {
    const user = userEvent.setup();
    render(<CtvTrackingTab clients={clients} loading={false} onReferClient={vi.fn()} />);

    expect(screen.getByText('~120K')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox'), 'thuan');

    expect(screen.getByText('Thuần Lê')).toBeInTheDocument();
    expect(screen.queryByText('Seed Client')).not.toBeInTheDocument();

    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'tay trang');

    expect(screen.getByText('Thuần Lê')).toBeInTheDocument();
    expect(screen.queryByText('Seed Client')).not.toBeInTheDocument();
  });
});
