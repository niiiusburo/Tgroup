import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '@/i18n';
import { CtvRecruitModal } from './CtvRecruitModal';

vi.mock('@/lib/api/ctv', () => ({
  createCtv: vi.fn(),
}));

describe('CtvRecruitModal', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('keeps the close button fixed outside the scrollable recruit body', () => {
    const { container } = render(<CtvRecruitModal open onClose={vi.fn()} onSuccess={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: /tuyển ctv/i });
    const closeButton = screen.getByRole('button', { name: 'Đóng' });
    const scrollBody = container.querySelector('.overflow-y-auto');

    expect(dialog).toContainElement(closeButton);
    expect(scrollBody).toBeInTheDocument();
    expect(scrollBody).not.toContainElement(closeButton);
    expect(scrollBody).toContainElement(screen.getByRole('button', { name: /tạo tài khoản ctv/i }));
  });

  it('clears typed-in fields after the modal is closed and reopened', () => {
    const { rerender } = render(<CtvRecruitModal open onClose={vi.fn()} onSuccess={vi.fn()} />);

    // The first textbox is the name field.
    const nameField = () => screen.getAllByRole('textbox')[0] as HTMLInputElement;
    fireEvent.change(nameField(), { target: { value: 'Jane Doe' } });
    expect(nameField().value).toBe('Jane Doe');

    // Close then reopen -> the form must be cleared (no stale data).
    rerender(<CtvRecruitModal open={false} onClose={vi.fn()} onSuccess={vi.fn()} />);
    rerender(<CtvRecruitModal open onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(nameField().value).toBe('');
  });
});
