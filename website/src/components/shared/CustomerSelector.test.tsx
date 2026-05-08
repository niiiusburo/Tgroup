import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomerSelector } from './CustomerSelector';
import type { Customer } from '@/types/customer';

const customers: Customer[] = [
  {
    id: 'customer-1',
    name: 'Nguyen Van A',
    phone: '0901000000',
    email: '',
    code: 'T8250',
    locationId: 'branch-1',
    status: 'active',
    lastVisit: '',
  },
  {
    id: 'customer-2',
    name: 'Tran Van B',
    phone: '0902000000',
    email: '',
    code: 'T9999',
    locationId: 'branch-1',
    status: 'active',
    lastVisit: '',
  },
];

describe('CustomerSelector', () => {
  it('filters visible options by customer code', () => {
    render(
      <CustomerSelector
        customers={customers}
        selectedId={null}
        onChange={vi.fn()}
        placeholder="Select customer"
      />,
    );

    fireEvent.click(screen.getByText('Select customer'));
    fireEvent.change(screen.getByPlaceholderText('Tìm theo tên, mã KH, SĐT, email...'), {
      target: { value: 'T8250' },
    });

    expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
    expect(screen.queryByText('Tran Van B')).not.toBeInTheDocument();
  });
});
