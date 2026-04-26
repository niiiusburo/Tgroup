import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppointmentDurationField } from '../AppointmentDurationField';

describe('AppointmentDurationField', () => {
  it('renders fixed duration options instead of a free number input', () => {
    const onChange = vi.fn();

    render(<AppointmentDurationField value={30} onChange={onChange} />);

    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();

    const select = screen.getByRole('combobox', {
      name: 'appointments:form.duration',
    });
    expect(select).toHaveValue('30');

    for (const minutes of ['10', '15', '20', '25', '30', '40', '45', '60', '90', '120']) {
      expect(screen.getByRole('option', { name: `${minutes} appointments:common.minutes` })).toBeInTheDocument();
    }

    fireEvent.change(select, { target: { value: '15' } });
    expect(onChange).toHaveBeenCalledWith(15);
  });
});
