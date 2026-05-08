/**
 * useCustomerProfile - Fetch a single customer's full profile from DB
 * Now includes real deposit_balance and outstanding_balance
 * @crossref:used-in[Customers]
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPartnerById, fetchAppointments, fetchCustomerBalance, type ApiAppointment, type ApiPartner } from '@/lib/api';
import { useTimezone } from '@/contexts/TimezoneContext';

export interface CustomerProfileData {
  id: string;
  name: string;
  phone: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  notes: string;
  medicalHistory: string;
  tags: string[];
  memberSince: string;
  totalVisits: number;
  lastVisit: string;
  totalSpent: number;
  companyId: string;
  companyName: string;
  code: string;
  depositBalance: number;
  outstandingBalance: number;
  salestaffid: string | null;
  salestaffLabel?: string | null;
  cskhid: string | null;
  cskhname: string | null;
  referraluserid: string | null;
  sourceid?: string | null;
  sourcename?: string | null;
  faceRegisteredAt: string | null;
}

export interface CustomerProfileResult {
  profile: CustomerProfileData | null;
  rawPartner: ApiPartner | null;
  appointments: readonly ApiAppointment[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  linkedCounts: {
    appointments: number;
    saleorders: number;
    dotkhams: number;
  };
}

export function useCustomerProfile(customerId: string | null): CustomerProfileResult {
  const { formatDate: formatDateTz } = useTimezone();
  const requestIdRef = useRef(0);
  const [profile, setProfile] = useState<CustomerProfileData | null>(null);
  const [rawPartner, setRawPartner] = useState<ApiPartner | null>(null);
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedCounts, setLinkedCounts] = useState({ appointments: 0, saleorders: 0, dotkhams: 0 });

  const fetchProfile = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!customerId) {
      setProfile(null);
      setRawPartner(null);
      setAppointments([]);
      setLinkedCounts({ appointments: 0, saleorders: 0, dotkhams: 0 });
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setAppointments([]);
    setLinkedCounts({ appointments: 0, saleorders: 0, dotkhams: 0 });

    const isCurrentRequest = () => requestIdRef.current === requestId;

    try {
      // Fetch partner details
      const partner = await fetchPartnerById(customerId);
      if (!isCurrentRequest()) return;

      // Build DOB string from available fields
      const dob = [partner.birthday, partner.birthmonth, partner.birthyear]
        .filter(Boolean)
        .join('/') || 'N/A';

      // Build address from available fields
      const address = [partner.street, partner.ward, partner.district, partner.city]
        .filter(Boolean)
        .join(', ') || 'N/A';

      const tags: string[] = [];

      const memberSince = partner.datecreated?.slice(0, 10) ?? 'N/A';
      const lastVisit = partner.lastupdated?.slice(0, 10) ?? 'N/A';

      const profileData: CustomerProfileData = {
        id: partner.id,
        name: partner.name,
        phone: partner.phone ?? '',
        email: partner.email ?? '',
        gender: partner.gender ?? 'N/A',
        dateOfBirth: dob,
        address,
        notes: partner.note ?? '',
        medicalHistory: partner.medicalhistory ?? '',
        tags,
        memberSince,
        totalVisits: 0,
        lastVisit,
        totalSpent: 0,
        companyId: partner.companyid ?? '',
        companyName: '',
        code: partner.code ?? '',
        depositBalance: 0,
        outstandingBalance: 0,
        salestaffid: partner.salestaffid ?? null,
        salestaffLabel: partner.salestaffname ?? null,
        cskhid: partner.cskhid ?? null,
        cskhname: partner.cskhname ?? null,
        referraluserid: partner.referraluserid ?? null,
        sourceid: partner.sourceid ?? null,
        sourcename: partner.sourcename ?? null,
        faceRegisteredAt: partner.face_registered_at ?? null,
      };

      // Fetch appointment history for this customer
      // Backend API expects partner_id (snake_case), frontend camelCase is auto-converted in apiFetch
      try {
        const aptRes = await fetchAppointments({
          offset: 0,
          limit: 500,
          partnerId: customerId, // auto-converted to partner_id by apiFetch
        });
        // Normalize dates to YYYY-MM-DD in the selected timezone so display
        // utilities don't mis-render ISO timestamps (e.g. showing 17 Apr when
        // the appointment is actually 18 Apr in ICT).
        const normalized = aptRes.items.map((apt) => {
          const dateHasTime = typeof apt.date === 'string' && apt.date.includes('T');
          return {
            ...apt,
            time: apt.time ?? (dateHasTime ? formatDateTz(apt.date, 'HH:mm') : apt.time),
            date: apt.date ? formatDateTz(apt.date, 'yyyy-MM-dd') : apt.date,
          };
        });
        if (!isCurrentRequest()) return;
        setAppointments(normalized);
        profileData.totalVisits = aptRes.totalItems;
        if (normalized.length > 0) {
          const sorted = [...normalized].sort(
            (a, b) => b.date.localeCompare(a.date),
          );
          profileData.lastVisit = sorted[0].date.slice(0, 10);
          profileData.companyName = sorted[0].companyname ?? '';
        }
      } catch {
        profileData.totalVisits = 0;
      }

      // Fetch deposit balance
      try {
        const balance = await fetchCustomerBalance(customerId);
        if (!isCurrentRequest()) return;
        profileData.depositBalance = balance.depositBalance;
        profileData.outstandingBalance = balance.outstandingBalance;
      } catch {
        // Balance not available
      }

      if (!isCurrentRequest()) return;

      // Extract linked record counts from partner API response
      setLinkedCounts({
        appointments: Number((partner as unknown as Record<string, number>).appointmentcount) || 0,
        saleorders: Number((partner as unknown as Record<string, number>).ordercount) || 0,
        dotkhams: Number((partner as unknown as Record<string, number>).dotkhamcount) || 0,
      });

      setRawPartner(partner);
      setProfile(profileData);
    } catch (err) {
      if (!isCurrentRequest()) return;
      setError(err instanceof Error ? err.message : 'Failed to load customer profile');
      console.error('useCustomerProfile: fetch error', err);
    } finally {
      if (isCurrentRequest()) {
        setIsLoading(false);
      }
    }
  }, [customerId, formatDateTz]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, rawPartner, appointments, isLoading, error, refetch: fetchProfile, linkedCounts };
}
