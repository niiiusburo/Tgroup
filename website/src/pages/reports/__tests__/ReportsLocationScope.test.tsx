import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Reports from '../../Reports';

const LOC_A = '11111111-1111-4111-8111-111111111111';
const LOC_B = '22222222-2222-4222-8222-222222222222';

const locationFilterState = {
  selectedLocationId: LOC_A,
  setSelectedLocationId: vi.fn(),
  allowedLocations: [{ id: LOC_A, name: 'Location A' }],
  isSingleLocation: true,
};

vi.mock('@/hooks/useLocations', () => ({
  useLocations: () => ({
    allLocations: [
      { id: LOC_A, name: 'Location A' },
      { id: LOC_B, name: 'Location B' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/contexts/LocationContext', () => ({
  useLocationFilter: () => locationFilterState,
}));

vi.mock('@/contexts/TimezoneContext', () => ({
  useTimezone: () => ({
    getToday: () => '2026-05-31',
  }),
}));

vi.mock('framer-motion', async () => {
  const React = await import('react');
  return {
    motion: {
      div: React.forwardRef(({ children, ...props }: any, ref: any) => React.createElement('div', { ...props, ref }, children)),
    },
  };
});

function renderReports() {
  return render(
    <MemoryRouter initialEntries={['/reports/dashboard']}>
      <Reports />
    </MemoryRouter>
  );
}

describe('Reports location scope', () => {
  beforeEach(() => {
    locationFilterState.selectedLocationId = LOC_A;
    locationFilterState.allowedLocations = [{ id: LOC_A, name: 'Location A' }];
    locationFilterState.isSingleLocation = true;
    locationFilterState.setSelectedLocationId.mockClear();
  });

  it('locks the reports location filter to the employee scoped location', () => {
    renderReports();

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select).toBeDisabled();
    expect(select).toHaveValue(LOC_A);
    expect(screen.getByRole('option', { name: 'Location A' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Location B' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /All Locations|Tất cả chi nhánh/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('reports-period-banner')).toHaveTextContent('Location A');
  });
});
