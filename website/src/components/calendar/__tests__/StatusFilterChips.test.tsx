import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusFilterChips } from '../StatusFilterChips';

describe('StatusFilterChips', () => {
  it('renders statuses and applies primary selected style', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <StatusFilterChips
        statuses={[{ value: 'scheduled', count: 2 }, { value: 'confirmed', count: 3 }]}
        selected={['confirmed']}
        onToggle={onToggle}
      />
    );

    const confirmedChip = screen.getByTestId('filter-status-confirmed');
    expect(confirmedChip.className).toMatch(/bg-primary/);

    await user.click(confirmedChip);
    expect(onToggle).toHaveBeenCalledWith('confirmed');
  });
});
