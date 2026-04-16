import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DoctorFilterChips } from '../DoctorFilterChips';

describe('DoctorFilterChips', () => {
  it('renders doctors and applies primary selected style', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <DoctorFilterChips
        doctors={[{ name: 'Admin', count: 2 }, { name: 'BS. Duy', count: 3 }]}
        selected={['Admin']}
        onToggle={onToggle}
      />
    );

    const adminChip = screen.getByText('Admin');
    expect(adminChip.className).toMatch(/bg-primary/);

    await user.click(adminChip);
    expect(onToggle).toHaveBeenCalledWith('Admin');
  });
});
