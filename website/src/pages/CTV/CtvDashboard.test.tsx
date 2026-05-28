import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CtvDashboard from './CtvDashboard';
import {
  fetchCtvClientJourneys,
  fetchCtvMe,
  fetchCtvSummary,
} from '@/lib/api/ctv';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'ctv-1', name: 'CTV Demo', email: 'ctv@example.test', is_ctv: true },
  }),
}));

vi.mock('@/lib/api/ctv', () => ({
  fetchCtvSummary: vi.fn(async () => ({
    totals: { pending: 0, paid: 0, dentalPending: 0, cosmeticPending: 0 },
    counts: { pending: 0, paid: 0 },
    recent: [],
    pendingList: [],
    paidList: [],
    payouts: [],
  })),
  fetchCtvClientJourneys: vi.fn(async () => ({ clients: [] })),
  fetchCtvMe: vi.fn(async () => ({
    id: 'ctv-1',
    name: 'CTV Demo',
    email: 'ctv@example.test',
    role: 'CTV',
  })),
  createCtv: vi.fn(),
  createBooking: vi.fn(),
}));

describe('CtvDashboard bilingual shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders an in-portal language toggle and keeps dashboard data loading stable when it is used', async () => {
    const user = userEvent.setup();
    render(<CtvDashboard />);

    await waitFor(() => expect(fetchCtvSummary).toHaveBeenCalledTimes(1));

    const bottomNavLabels = Array.from(screen.getByRole('navigation').querySelectorAll('button'))
      .map((node) => node.textContent?.trim());
    expect(bottomNavLabels).toEqual(['tabs.home', 'tabs.commission', 'tabs.tracking', 'tabs.me']);
    expect(bottomNavLabels).not.toContain('tabs.referrals');

    await user.click(screen.getByRole('button', { name: /switch language/i }));
    expect(screen.getByTestId('lang-dropdown')).toBeInTheDocument();

    await user.click(screen.getByText('English'));

    expect(localStorage.getItem('tg-lang')).toBe('en');
    expect(fetchCtvSummary).toHaveBeenCalledTimes(1);
    expect(fetchCtvClientJourneys).toHaveBeenCalledTimes(1);
    expect(fetchCtvMe).toHaveBeenCalledTimes(1);
  });
});
