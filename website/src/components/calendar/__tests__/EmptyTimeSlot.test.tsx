import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyTimeSlot } from '../EmptyTimeSlot';

describe('EmptyTimeSlot', () => {
  it('renders time and fires onClick', () => {
    const onClick = vi.fn();
    render(<EmptyTimeSlot time="14:30" onClick={onClick} />);
    expect(screen.getByLabelText('Thêm lịch hẹn lúc 14:30')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Thêm lịch hẹn lúc 14:30'));
    expect(onClick).toHaveBeenCalledWith('14:30');
  });
});
