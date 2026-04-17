import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckInActions } from '../CheckInActions';

describe('CheckInActions', () => {
  it('fires onCheckIn and onCancel', () => {
    const onCheckIn = vi.fn();
    const onCancel = vi.fn();
    render(<CheckInActions onCheckIn={onCheckIn} onCancel={onCancel} />);
    fireEvent.click(screen.getByLabelText('Check-in'));
    expect(onCheckIn).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Hủy hẹn'));
    expect(onCancel).toHaveBeenCalled();
  });
});
