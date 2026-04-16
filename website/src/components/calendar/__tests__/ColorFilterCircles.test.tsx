import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorFilterCircles } from '../ColorFilterCircles';

describe('ColorFilterCircles', () => {
  it('renders all color chips including zero counts', () => {
    render(
      <ColorFilterCircles
        selected={[]}
        counts={{ '0': 0, '1': 4, '2': 1, '3': 1 }}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByTestId('filter-color-all')).toBeTruthy();
    expect(screen.getByTestId('filter-color-0')).toHaveTextContent('0');
    expect(screen.getByTestId('filter-color-1')).toHaveTextContent('4');
    expect(screen.getByTestId('filter-color-2')).toHaveTextContent('1');
    expect(screen.getByTestId('filter-color-3')).toHaveTextContent('1');
    expect(screen.getByTestId('filter-color-4')).toHaveTextContent('0');
    expect(screen.getByTestId('filter-color-5')).toHaveTextContent('0');
    expect(screen.getByTestId('filter-color-6')).toHaveTextContent('0');
    expect(screen.getByTestId('filter-color-7')).toHaveTextContent('0');
  });

  it('applies primary selected styling when a color is selected', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <ColorFilterCircles
        selected={['1']}
        counts={{ '1': 4 }}
        onToggle={onToggle}
      />
    );

    const chip = screen.getByTestId('filter-color-1');
    expect(chip.className).toMatch(/bg-primary/);
    await user.click(chip);
    expect(onToggle).toHaveBeenCalledWith('1');
  });
});
