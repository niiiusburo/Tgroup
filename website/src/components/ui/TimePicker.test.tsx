import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TimePicker } from './TimePicker';

describe('TimePicker', () => {
  it('renders selectable 5-minute slots when requested', () => {
    const onChange = vi.fn();

    render(
      <TimePicker
        value="09:00"
        onChange={onChange}
        interval={5}
        startHour={9}
        endHour={9}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /09:00/ }));

    expect(screen.getByRole('button', { name: /09:05/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /09:10/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /09:55/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /09:05/ }));

    expect(onChange).toHaveBeenCalledWith('09:05');
  });
});
