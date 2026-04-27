import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DataTable, type Column } from '../DataTable';

interface Row {
  readonly id: string;
  readonly name: string;
}

const rows: Row[] = Array.from({ length: 20 }, (_, index) => ({
  id: String(index + 1),
  name: `Customer ${index + 1}`,
}));

const columns: readonly Column<Row>[] = [
  { key: 'name', header: 'Customer' },
];

describe('DataTable pagination', () => {
  it('uses the server total and requests the next page in controlled mode', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();

    render(
      <DataTable<Row>
        columns={columns}
        data={rows}
        keyExtractor={(row) => row.id}
        pageSize={20}
        totalItems={35051}
        currentPage={0}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText(/Showing 1.20 of 35051/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '1753' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '11' })).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Next page'));

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('shows loading state instead of empty state while data is pending', () => {
    render(
      <DataTable<Row>
        columns={columns}
        data={[]}
        keyExtractor={(row) => row.id}
        loading
        loadingMessage="Loading patients..."
        emptyMessage="No patients"
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading patients...');
    expect(screen.queryByText('No patients')).not.toBeInTheDocument();
  });
});
