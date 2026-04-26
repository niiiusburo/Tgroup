import { useMemo } from 'react';
import type { CustomerProfileData } from '@/hooks/useCustomerProfile';
import type { Customer } from '@/hooks/useCustomers';

/**
 * Build CustomerProfileData for CustomerProfile component
 * Falls back through: hookProfile -> listCustomer -> customers list
 * @crossref:used-in[Customers]
 */
export function useCustomerProfileData(
  hookProfile: CustomerProfileData | null,
  listCustomer: Customer | undefined,
  selectedCustomerId: string | null,
  locationNameMap: Map<string, string>,
  customers: readonly Customer[],
): CustomerProfileData {
  const customerCode = useMemo(() => {
    if (!selectedCustomerId) return '';
    return customers.find((c) => c.id === selectedCustomerId)?.code ?? '';
  }, [selectedCustomerId, customers]);

  return useMemo(() => {
    if (hookProfile) {
      return {
        id: hookProfile.id,
        name: hookProfile.name,
        phone: hookProfile.phone,
        email: hookProfile.email,
        dateOfBirth: hookProfile.dateOfBirth,
        gender: hookProfile.gender === 'female' ? 'female' : 'male',
        address: hookProfile.address,
        notes: hookProfile.notes,
        medicalHistory: hookProfile.medicalHistory,
        tags: hookProfile.tags,
        memberSince: hookProfile.memberSince,
        totalVisits: hookProfile.totalVisits,
        lastVisit: hookProfile.lastVisit,
        totalSpent: hookProfile.totalSpent,
        companyId: hookProfile.companyId,
        companyName:
          hookProfile.companyName ||
          locationNameMap.get(hookProfile.companyId) ||
          'N/A',
        code: customerCode,
        depositBalance: hookProfile.depositBalance,
        outstandingBalance: hookProfile.outstandingBalance,
        salestaffid: hookProfile.salestaffid,
        salestaffLabel: hookProfile.salestaffLabel,
        cskhid: hookProfile.cskhid,
        cskhname: hookProfile.cskhname,
        referraluserid: hookProfile.referraluserid,
        sourcename: hookProfile.sourcename,
      };
    }

    // Fallback to listCustomer (from paginated customers list)
    if (listCustomer) {
      return {
        id: listCustomer.id,
        name: listCustomer.name,
        phone: listCustomer.phone,
        email: listCustomer.email,
        dateOfBirth: 'N/A',
        gender: 'male',
        address: 'N/A',
        notes: '',
        medicalHistory: '',
        tags: [],
        memberSince: 'N/A',
        totalVisits: 0,
        lastVisit: listCustomer.lastVisit ?? 'N/A',
        totalSpent: 0,
        companyId: listCustomer.locationId ?? '',
        companyName: locationNameMap.get(listCustomer.locationId ?? '') ?? 'N/A',
        code: listCustomer.code ?? '',
        depositBalance: 0,
        outstandingBalance: 0,
        salestaffid: null,
        cskhid: null,
        cskhname: null,
        referraluserid: null,
      };
    }

    // Ultimate fallback
    return {
      id: selectedCustomerId ?? '',
      name: '',
      phone: '',
      email: '',
      dateOfBirth: 'N/A',
      gender: 'male',
      address: 'N/A',
      notes: '',
      medicalHistory: '',
      tags: [],
      memberSince: 'N/A',
      totalVisits: 0,
      lastVisit: 'N/A',
      totalSpent: 0,
      companyId: '',
      companyName: 'N/A',
      code: customerCode,
      depositBalance: 0,
      outstandingBalance: 0,
      salestaffid: null,
      cskhid: null,
      cskhname: null,
      referraluserid: null,
    };
  }, [hookProfile, listCustomer, selectedCustomerId, locationNameMap, customerCode]);
}
