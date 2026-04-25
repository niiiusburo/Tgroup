import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomerAssignments } from './CustomerAssignments';

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({
    allEmployees: [{ id: 'sales-id', name: 'ĐINH NGUYỄN CẨM LY' }],
  }),
}));

describe('CustomerAssignments', () => {
  it('uses the TDental text assignment label before derived sale staff IDs', () => {
    render(
      <CustomerAssignments
        companyName="Tấm Dentist Thủ Đức"
        salestaffId="sales-id"
        salestaffLabel="LYBAE"
        cskhId={null}
        cskhName={null}
        referralUserId={null}
        sourceName="Khách hàng giới thiệu"
      />,
    );

    expect(screen.getByText('LYBAE')).toBeInTheDocument();
    expect(screen.queryByText('ĐINH NGUYỄN CẨM LY')).not.toBeInTheDocument();
  });

  it('shows customer source when no specific referral user is assigned', () => {
    render(
      <CustomerAssignments
        companyName="Tấm Dentist Thủ Đức"
        salestaffId={null}
        salestaffLabel={null}
        cskhId={null}
        cskhName={null}
        referralUserId={null}
        sourceName="Khách hàng giới thiệu"
      />,
    );

    expect(screen.getByText('Khách hàng giới thiệu')).toBeInTheDocument();
  });
});
