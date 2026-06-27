import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildCustomerColumns } from './CustomerColumns';
import type { Customer } from '@/hooks/useCustomers';

const customer: Customer = {
  id: 'customer-1',
  name: 'Customer One',
  phone: '0909000000',
  email: '',
  locationId: 'loc-1',
  status: 'active',
  lastVisit: '2026-06-27',
  code: 'T0001',
};

const t = (key: string) => key;

describe('CustomerColumns investor visibility', () => {
  it('does not include the investor checkbox column unless enabled', () => {
    const columns = buildCustomerColumns(new Map(), false, vi.fn(), t);

    expect(columns.map((col) => col.key)).not.toContain('investorVisible');
  });

  it('renders an accessible investor checkbox and stops row navigation', () => {
    const onChange = vi.fn();
    const parentClick = vi.fn();
    const columns = buildCustomerColumns(new Map(), false, vi.fn(), t, {
      enabled: true,
      label: 'Investor',
      loading: false,
      updatingIds: new Set(),
      isVisible: (id) => id === customer.id,
      onChange,
      getToggleLabel: (name) => `Show ${name} to investor`,
    });
    const investorColumn = columns.find((col) => col.key === 'investorVisible');

    render(<div onClick={parentClick}>{investorColumn?.render?.(customer)}</div>);

    const checkbox = screen.getByRole('checkbox', { name: 'Show Customer One to investor' });
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledWith('customer-1', false);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('disables the checkbox while the row is updating', () => {
    const columns = buildCustomerColumns(new Map(), false, vi.fn(), t, {
      enabled: true,
      label: 'Investor',
      loading: false,
      updatingIds: new Set([customer.id]),
      isVisible: () => false,
      onChange: vi.fn(),
      getToggleLabel: (name) => `Show ${name} to investor`,
    });
    const investorColumn = columns.find((col) => col.key === 'investorVisible');

    render(<>{investorColumn?.render?.(customer)}</>);

    expect(screen.getByRole('checkbox')).toBeDisabled();
  });
});
