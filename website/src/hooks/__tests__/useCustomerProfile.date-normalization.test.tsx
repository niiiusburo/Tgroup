/**
 * @fileoverview Tests for date normalization in useCustomerProfile
 * Ensures ISO timestamps from the API are converted to YYYY-MM-DD in the
 * selected timezone before being stored in state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { TimezoneProvider } from '@/contexts/TimezoneContext';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';

// Mock the API module
vi.mock('@/lib/api', () => ({
  fetchPartnerById: vi.fn(() =>
    Promise.resolve({
      id: 'cust-1',
      name: 'Test Patient',
      phone: '0901234567',
      email: 'test@example.com',
      gender: 'male',
      birthday: '1990',
      birthmonth: '05',
      birthyear: '1990',
      street: '123 Main St',
      ward: 'Ward 1',
      district: 'District 1',
      city: 'HCMC',
      note: '',
      medicalhistory: '',
      datecreated: '2024-01-01T00:00:00Z',
      lastupdated: '2024-01-01T00:00:00Z',
      companyid: 'loc-1',
      code: 'T001',
      salestaffid: null,
      cskhid: null,
      cskhname: null,
      referraluserid: null,
    })
  ),
  fetchAppointments: vi.fn(() =>
    Promise.resolve({
      offset: 0,
      limit: 500,
      totalItems: 1,
      items: [
        {
          id: 'apt-1',
          name: 'AP247648',
          // This is what the API returns for a DB date of 2026-04-18 00:00:00
          date: '2026-04-17T17:00:00.000Z',
          time: '07:00',
          datetimeappointment: null,
          timeexpected: 30,
          note: '',
          state: 'scheduled',
          partnerid: 'cust-1',
          partnername: 'Test Patient',
          partnerdisplayname: 'Test Patient',
          partnerphone: '0901234567',
          partnercode: 'T001',
          companyid: 'loc-1',
          companyname: 'Main Clinic',
          userid: null,
          username: null,
          doctorid: 'doc-1',
          doctorname: 'Dr. Smith',
          assistantid: null,
          assistantname: null,
          dentalaideid: null,
          dentalaidename: null,
          dotkhamid: null,
          dotkhamname: null,
          saleorderid: null,
          saleordername: null,
          isrepeatcustomer: false,
          color: '0',
          datetimearrived: null,
          datetimeseated: null,
          datetimedismissed: null,
          datedone: null,
          lastdatereminder: null,
          customercarestatus: null,
          isnotreatment: false,
          leadid: null,
          callid: null,
          teamid: null,
          teamname: null,
          customerreceiptid: null,
          receiptdate: null,
          datecreated: '2024-01-01T00:00:00Z',
          lastupdated: '2024-01-01T00:00:00Z',
          createdbyid: null,
          writebyid: null,
          productid: null,
          productname: null,
        },
      ],
      aggregates: { total: 1, byState: { scheduled: 1 } },
    })
  ),
  fetchCustomerBalance: vi.fn(() =>
    Promise.resolve({ depositBalance: 0, outstandingBalance: 0 })
  ),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <TimezoneProvider>{children}</TimezoneProvider>;
}

describe('useCustomerProfile date normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should normalize ISO timestamp dates to YYYY-MM-DD in ICT', async () => {
    const { result } = renderHook(() => useCustomerProfile('cust-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(1);
    });

    const apt = result.current.appointments[0];
    // The API returned '2026-04-17T17:00:00.000Z' but in ICT (UTC+7)
    // that's 2026-04-18 00:00:00, so the normalized date should be '2026-04-18'
    expect(apt.date).toBe('2026-04-18');
  });

  it('should keep YYYY-MM-DD dates as-is', async () => {
    const { fetchAppointments } = await import('@/lib/api');
    vi.mocked(fetchAppointments).mockResolvedValueOnce({
      offset: 0,
      limit: 500,
      totalItems: 1,
      items: [
        {
          id: 'apt-2',
          name: 'AP000001',
          date: '2026-05-01',
          time: '09:00',
          state: 'scheduled',
          partnerid: 'cust-1',
          partnername: 'Test Patient',
          partnerdisplayname: 'Test Patient',
          partnerphone: '0901234567',
          partnercode: 'T001',
          companyid: 'loc-1',
          companyname: 'Main Clinic',
          doctorid: 'doc-1',
          doctorname: 'Dr. Smith',
          timeexpected: 30,
          note: '',
          color: '0',
          datecreated: '2024-01-01T00:00:00Z',
          lastupdated: '2024-01-01T00:00:00Z',
          productid: null,
          productname: null,
        } as any,
      ],
      aggregates: { total: 1, byState: { scheduled: 1 } },
    });

    const { result } = renderHook(() => useCustomerProfile('cust-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.appointments).toHaveLength(1);
    });

    expect(result.current.appointments[0].date).toBe('2026-05-01');
  });
});
