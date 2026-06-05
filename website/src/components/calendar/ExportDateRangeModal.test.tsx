import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '@/i18n';
import { TimezoneProvider } from '@/contexts/TimezoneContext';
import { ExportDateRangeModal } from './ExportDateRangeModal';

function modalTree(isOpen: boolean) {
  return (
    <TimezoneProvider>
      <ExportDateRangeModal
        isOpen={isOpen}
        onClose={vi.fn()}
        onApply={vi.fn()}
        referenceDate={new Date('2026-06-02T00:00:00')}
      />
    </TimezoneProvider>
  );
}

function renderExportModal() {
  return render(modalTree(true));
}

describe('ExportDateRangeModal', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('keeps close and action buttons outside the scrollable date body', () => {
    const { container } = renderExportModal();

    const dialog = screen.getByRole('dialog', { name: /chọn khoảng/i });
    const closeButton = screen.getByRole('button', { name: 'Đóng' });
    const applyButton = screen.getByRole('button', { name: /áp dụng/i });
    const scrollBody = container.querySelector('.overflow-y-auto');

    expect(dialog).toContainElement(closeButton);
    expect(dialog).toContainElement(applyButton);
    expect(scrollBody).toBeInTheDocument();
    expect(scrollBody).not.toContainElement(closeButton);
    expect(scrollBody).not.toContainElement(applyButton);
    expect(scrollBody).toContainElement(screen.getByRole('button', { name: /từ ngày/i }));
    expect(scrollBody).toContainElement(screen.getByRole('button', { name: /đến ngày/i }));
  });

  it('clears the selected preset/date range after the modal is closed and reopened', () => {
    const { rerender } = render(modalTree(true));
    const applyButton = () => screen.getByRole('button', { name: /áp dụng/i });

    // No selection yet -> Apply is disabled.
    expect(applyButton()).toBeDisabled();

    // Selecting a preset enables Apply.
    fireEvent.click(screen.getByRole('button', { name: '7 ngày' }));
    expect(applyButton()).toBeEnabled();

    // Close then reopen -> state must reset, so Apply is disabled again.
    rerender(modalTree(false));
    rerender(modalTree(true));
    expect(applyButton()).toBeDisabled();
  });
});
