import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DoctorCtvTrail } from '@/components/shared/DoctorCtvTrail';

describe('DoctorCtvTrail', () => {
  it('renders doctor then CTV as a breadcrumb', () => {
    render(<DoctorCtvTrail doctorName="BS. Hùng" ctvName="Lan" />);
    expect(screen.getByText(/BS\. Hùng/)).toBeInTheDocument();
    expect(screen.getByText(/Lan/)).toBeInTheDocument();
    expect(screen.getByTestId('doctor-ctv-trail')).toBeInTheDocument();
  });

  it('renders doctor only when no CTV (no trailing chevron)', () => {
    render(<DoctorCtvTrail doctorName="BS. Hùng" ctvName={null} />);
    expect(screen.getByText(/BS\. Hùng/)).toBeInTheDocument();
    expect(screen.queryByTestId('doctor-ctv-trail-ctv')).not.toBeInTheDocument();
  });

  it('renders nothing when both are empty', () => {
    const { container } = render(<DoctorCtvTrail doctorName={null} ctvName={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
