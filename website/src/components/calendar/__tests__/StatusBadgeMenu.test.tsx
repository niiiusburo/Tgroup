import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusBadgeMenu } from '../StatusBadgeMenu';

describe('StatusBadgeMenu', () => {
  it('opens dropdown on click', () => {
    render(<StatusBadgeMenu phase="waiting" arrivalTime="08:00:00" treatmentStartTime={null} onPhaseChange={vi.fn()} />);
    fireEvent.click(screen.getByText('Chờ khám'));
    expect(screen.getByText('Đang khám')).toBeInTheDocument();
  });

  it('fires onPhaseChange when an option is selected', () => {
    const onChange = vi.fn();
    render(<StatusBadgeMenu phase="waiting" arrivalTime="08:00:00" treatmentStartTime={null} onPhaseChange={onChange} />);
    fireEvent.click(screen.getByText('Chờ khám'));
    fireEvent.click(screen.getByText('Đang khám'));
    expect(onChange).toHaveBeenCalledWith('in-treatment');
  });
});
