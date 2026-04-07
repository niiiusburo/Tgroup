/**
 * useCustomerProfile - Fetch a single customer's full profile from DB
 * Combines partner data with their appointment history for the profile view.
 * Photos, deposits, and service-history have no DB tables in demo — these remain mock.
 * @crossref:used-in[Customers]
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchPartnerById, fetchAppointments, type ApiAppointment } from '@/lib/api';

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
}

export interface CustomerProfileResult {
  profile: CustomerProfileData | null;
  appointments: readonly ApiAppointment[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCustomerProfile(customerId: string | null): CustomerProfileResult {
  const [profile, setProfile] = useState<CustomerProfileData | null>(null);
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!customerId) {
      setProfile(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch partner details
      const partner = await fetchPartnerById(customerId);

      // Build DOB string from available fields
      const dob = [partner.birthday, partner.birthmonth, partner.birthyear]
        .filter(Boolean)
        .join('/') || 'N/A';

      // Build address from available fields
      const address = [partner.street, partner.ward, partner.district, partner.city]
        .filter(Boolean)
        .join(', ') || 'N/A';

      // Build tags from DB flags
      const tags: string[] = [];
      if (partner.treatmentstatus) tags.push(partner.treatmentstatus);

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
        totalVisits: 0,   // Populated from appointments below
        lastVisit,
        totalSpent: 0,    // Requires sale orders aggregation
        companyId: partner.companyid ?? '',
        companyName: '',
      };

      // Fetch appointment history for this customer
      try {
        const aptRes = await fetchAppointments({
          offset: 0,
          limit: 200,
          partnerId: customerId,
        });
        setAppointments(aptRes.items);
        profileData.totalVisits = aptRes.totalItems;
        if (aptRes.totalItems > 0) {
          const sorted = [...aptRes.items].sort(
            (a, b) => b.date.localeCompare(a.date),
          );
          profileData.lastVisit = sorted[0].date.slice(0, 10);
          profileData.companyName = sorted[0].companyname ?? '';
        }
      } catch {
        // Appointments fetch failed — keep zeros
        profileData.totalVisits = 0;
      }

      setProfile(profileData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer profile');
      console.error('useCustomerProfile: fetch error', err);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, appointments, isLoading, error, refetch: fetchProfile } as const;
}
