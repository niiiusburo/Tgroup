import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WaitTimer } from './WaitTimer';

describe('WaitTimer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows live seconds after the first minute', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 8, 10, 2, 3));

    render(<WaitTimer arrivalTime="10:00:00" treatmentStartTime={null} compact />);

    expect(screen.getByText('2m 3s')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('2m 4s')).toBeInTheDocument();
  });

  it('uses full persisted arrival timestamps instead of only time of day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-08T13:04:53+07:00'));

    render(
      <WaitTimer
        arrivalTime="2026-05-08T13:00:00+07:00"
        treatmentStartTime={null}
        compact
      />,
    );

    expect(screen.getByText('4m 53s')).toBeInTheDocument();
  });

  it('does not clamp an earlier dated arrival to zero when its clock time is later than now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-08T13:04:53+07:00'));

    render(
      <WaitTimer
        arrivalTime="2026-05-07T18:04:53+07:00"
        treatmentStartTime={null}
        compact
      />,
    );

    expect(screen.getByText('19h 0m 0s')).toBeInTheDocument();
  });
});
