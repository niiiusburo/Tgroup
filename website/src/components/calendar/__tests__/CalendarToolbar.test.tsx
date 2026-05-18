import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CalendarToolbar } from '../CalendarToolbar';

vi.mock('@/contexts/TimezoneContext', () => ({
  useTimezone: () => ({
    getToday: () => '2026-05-18',
    formatDate: (date: Date, format: string) => {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .formatToParts(date)
        .reduce<Record<string, string>>((acc, part) => {
          if (part.type !== 'literal') acc[part.type] = part.value;
          return acc;
        }, {});
      if (format === 'yyyy-MM') return `${parts.year}-${parts.month}`;
      return `${parts.year}-${parts.month}-${parts.day}`;
    },
  }),
}));

const noop = vi.fn();

describe('CalendarToolbar', () => {
  it('keeps tablet widths on the wrapped toolbar layout', () => {
    render(
      <CalendarToolbar
        viewMode="day"
        onViewModeChange={noop}
        currentDate={new Date('2026-05-18T12:00:00+07:00')}
        dateLabel="Thứ Hai, 18 tháng 5, 2026"
        onDateChange={noop}
        onNavigate={noop}
        onToday={noop}
        search=""
        onSearchChange={noop}
        suggestions={[]}
        isLoading={false}
        canExportAppointments
        onExportDirect={noop}
        onExportPreview={noop}
        onQuickAddSuccess={noop}
        onOpenFilter={noop}
        filterCount={0}
      />,
    );

    expect(screen.getByTestId('calendar-toolbar')).toHaveClass('xl:flex-row');
    expect(screen.getByTestId('calendar-toolbar')).not.toHaveClass('lg:flex-row');
    expect(screen.getByTestId('calendar-toolbar-actions')).toHaveClass('sm:flex-wrap', 'xl:flex-nowrap');
    expect(screen.getByTestId('calendar-toolbar-actions')).not.toHaveClass('lg:flex-nowrap');
    expect(screen.getByRole('button', { name: 'dayView' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'weekView' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'monthView' })).toBeVisible();
  });
});
