import type { ApiPartner } from '@/lib/api';
import type { CustomerStatus } from '@/data/mockCustomers';

export type { CustomerStatus } from '@/data/mockCustomers';

export interface Customer {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly locationId: string;
  readonly status: CustomerStatus;
  readonly lastVisit: string;
  readonly code?: string | null;
  readonly gender?: string | null;
  readonly street?: string | null;
  readonly city?: string | null;
  readonly district?: string | null;
  readonly ward?: string | null;
  readonly comment?: string | null;
  readonly note?: string | null;
  readonly sourceid?: string | null;
  readonly sourcename?: string | null;
  readonly agentname?: string | null;
  readonly companyname?: string | null;
  readonly cskhid?: string | null;
  readonly cskhname?: string | null;
}

export type CustomerStatusFilter = 'all' | CustomerStatus;
export type CustomerLocationFilter = string;
export const CUSTOMER_PAGE_SIZE = 20;
export const CUSTOMER_LOOKUP_LIMIT = 200;

export function mapPartnerToCustomer(p: ApiPartner): Customer {
  return {
    id: p.id,
    name: p.name || '',
    phone: p.phone || '',
    email: p.email || '',
    locationId: p.companyid || '',
    status: p.status ? 'active' : 'inactive',
    lastVisit: p.lastupdated?.slice(0, 10) || p.datecreated?.slice(0, 10) || '',
    code: p.code,
    gender: p.gender,
    street: p.street,
    city: p.city,
    district: p.district,
    ward: p.ward,
    comment: p.comment,
    note: p.note,
    sourceid: p.sourceid ?? null,
    sourcename: p.sourcename ?? null,
    agentname: p.agentname,
    companyname: p.companyname,
    cskhid: p.cskhid,
    cskhname: p.cskhname,
  };
}
