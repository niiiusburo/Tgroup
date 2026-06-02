import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TimezoneProvider } from '@/contexts/TimezoneContext';
import { DatePicker } from './DatePicker';

function renderDatePicker(onChange = vi.fn()) {
  return render(
    <TimezoneProvider>
      <DatePicker value="2026-06-02" onChange={onChange} label="Ngay hen" />
    </TimezoneProvider>
  );
}

function renderClearableDatePicker(onChange = vi.fn()) {
  return render(
    <TimezoneProvider>
      <DatePicker value="2026-06-02" onChange={onChange} label="Ngay hen" allowClear />
    </TimezoneProvider>
  );
}

describe('DatePicker', () => {
  it('opens an in-flow Monday-first calendar panel', () => {
    renderDatePicker();

    fireEvent.click(screen.getByRole('button', { name: /ngay hen: 02\/06\/2026/i }));

    const panel = screen.getByTestId('date-picker-panel');
    expect(panel).toBeInTheDocument();
    expect(panel).not.toHaveClass('absolute');

    const weekdays = within(panel).getAllByTestId('date-picker-weekday').map((el) => el.textContent);
    expect(weekdays).toEqual(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']);

    const cells = within(panel).getAllByTestId('date-picker-cell');
    expect(cells[0]).toHaveTextContent('1');
    expect(cells[1]).toHaveTextContent('2');
  });

  it('selects a date and closes the panel', () => {
    const onChange = vi.fn();
    renderDatePicker(onChange);

    fireEvent.click(screen.getByRole('button', { name: /ngay hen: 02\/06\/2026/i }));
    fireEvent.click(within(screen.getByTestId('date-picker-panel')).getByRole('button', { name: '15/06/2026' }));

    expect(onChange).toHaveBeenCalledWith('2026-06-15');
    expect(screen.queryByTestId('date-picker-panel')).not.toBeInTheDocument();
  });

  it('clears optional date values without a native date input', () => {
    const onChange = vi.fn();
    renderClearableDatePicker(onChange);

    fireEvent.click(screen.getByRole('button', { name: /ngay hen: 02\/06\/2026/i }));
    fireEvent.click(within(screen.getByTestId('date-picker-panel')).getByRole('button', { name: /xóa|clear/i }));

    expect(onChange).toHaveBeenCalledWith('');
    expect(screen.queryByTestId('date-picker-panel')).not.toBeInTheDocument();
  });
});
