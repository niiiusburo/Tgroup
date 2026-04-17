import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportDialog } from '../ExportDialog';

describe('ExportDialog', () => {
  it('toggles date inputs when mode changes', () => {
    render(<ExportDialog isOpen onClose={vi.fn()} onExport={vi.fn()} />);
    expect(screen.queryAllByDisplayValue('')).toHaveLength(0);
    fireEvent.click(screen.getByLabelText('Theo khoảng thờigian'));
    expect(screen.getAllByDisplayValue('')).toHaveLength(2);
  });

  it('fires onExport with correct payload', () => {
    const onExport = vi.fn();
    render(
      <ExportDialog
        isOpen
        onClose={vi.fn()}
        onExport={onExport}
        defaultDateFrom="2026-04-01"
        defaultDateTo="2026-04-17"
      />
    );
    fireEvent.click(screen.getByLabelText('Theo khoảng thờigian'));
    fireEvent.click(screen.getByText('Xuất file'));
    expect(onExport).toHaveBeenCalledWith('date-range', '2026-04-01', '2026-04-17');
  });
});
