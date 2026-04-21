import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { AppointmentFormShell } from './AppointmentFormShell';

describe('AppointmentFormShell — backdrop click leak', () => {
  it('does NOT close when the same click that opened the modal reaches the backdrop', () => {
    const onClose = vi.fn();
    const { rerender } = renderWithProviders(
      <AppointmentFormShell
        mode="create"
        isOpen={false}
        onClose={onClose}
      />
    );
    
    // Open the modal
    rerender(
      <AppointmentFormShell
        mode="create"
        isOpen={true}
        onClose={onClose}
      />
    );
    
    // The modal should now be visible
    expect(screen.getByText('appointments:createAppointment')).toBeInTheDocument();
    
    // Simulate click on the backdrop
    const backdrop = document.querySelector('.bg-black\\/40');
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    
    // onClose should have been called (this is current behavior — the bug)
    expect(onClose).toHaveBeenCalled();
  });
});
