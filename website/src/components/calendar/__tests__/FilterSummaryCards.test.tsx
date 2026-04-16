import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FilterSummaryCards } from '../FilterSummaryCards';

describe('FilterSummaryCards', () => {
  it('displays appointment count and formatted duration', () => {
    render(
      <FilterSummaryCards totalAppointments={6} totalDurationMinutes={175} />
    );

    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('Lịch hẹn')).toBeInTheDocument();
    expect(screen.getByText('2g55p')).toBeInTheDocument();
    expect(screen.getByText('Dự kiến')).toBeInTheDocument();
  });

  it('shows dash for zero or negative duration', () => {
    render(
      <FilterSummaryCards totalAppointments={0} totalDurationMinutes={0} />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
