import { apiFetch, type PaginatedResponse } from './core';

// ─── Partners (Customers) ─────────────────────────────────────────

export interface ApiPartner {
  id: string;
  code: string | null;
  ref: string | null;
  displayname: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  street: string | null;
  city: string | null;
  district: string | null;
  ward: string | null;
  // Raw DB column names used in write operations (read queries alias these to city/district/ward)
  cityname?: string | null;
  districtname?: string | null;
  wardname?: string | null;
  gender: string | null;
  birthyear: number | null;
  birthmonth: number | null;
  birthday: number | null;
  medicalhistory: string | null;
  comment: string | null;
  note: string | null;
  status: boolean;
  treatmentstatus: string | null;
  sourceid?: string | null;
  sourcename?: string | null;
  referraluserid: string | null;
  agentid: string | null;
  agentname: string | null;
  companyid: string | null;
  companyname: string | null;
  customer: boolean;
  supplier: boolean;
  employee: boolean;
  // CSKH (Customer Service) assignment
  cskhid: string | null;
  cskhname: string | null;
  // Sales staff assignment
  salestaffid: string | null;
  salestaffname?: string | null;
  datecreated: string | null;
  lastupdated: string | null;
  // Extended fields (returned by single-partner fetch)
  taxcode: string | null;
  identitynumber: string | null;
  healthinsurancecardnumber: string | null;
  emergencyphone: string | null;
  weight: number | null;
  jobtitle: string | null;
  isbusinessinvoice: boolean | null;
  unitname: string | null;
  unitaddress: string | null;
  personalname: string | null;
  personalidentitycard: string | null;
  personaltaxcode: string | null;
  personaladdress: string | null;
  face_subject_id?: string | null;
  face_registered_at?: string | null;
}

export interface PartnerAggregates {
  readonly total: number;
  readonly active: number;
  readonly inactive: number;
}

export type PartnersResponse = PaginatedResponse<ApiPartner> & {
  readonly aggregates?: PartnerAggregates | null;
};

export function fetchPartners(params?: {
  offset?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  status?: 'active' | 'inactive' | 'pending';
}) {
  return apiFetch<PartnersResponse>('/Partners', {
    params: {
      offset: params?.offset ?? 0,
      limit: params?.limit ?? 50,
      search: params?.search,
      companyId: params?.companyId,
      status: params?.status,
    },
  });
}

export function fetchPartnerById(id: string) {
  return apiFetch<ApiPartner>(`/Partners/${id}`);
}

export interface ResolvedPartner {
  id: string;
  code: string | null;
  name: string | null;
  phone: string | null;
}

export interface PartnerResolveSuccess {
  matchedBy: 'uuid' | 'ref' | 'phone';
  partner: ResolvedPartner;
}

export interface PartnerResolveCandidate {
  id: string;
  code: string | null;
  name: string | null;
  phone: string | null;
  lastUpdated: string | null;
}

export interface PartnerResolveAmbiguous {
  code: 'CUSTOMER_LOOKUP_AMBIGUOUS';
  matchedBy: 'ref' | 'phone';
  candidates: PartnerResolveCandidate[];
}

export type PartnerResolveResult =
  | { status: 'found'; partner: ResolvedPartner; matchedBy: PartnerResolveSuccess['matchedBy'] }
  | { status: 'not-found' }
  | { status: 'ambiguous'; candidates: PartnerResolveCandidate[]; matchedBy: 'ref' | 'phone' };

export async function resolvePartnerKey(key: string): Promise<PartnerResolveResult> {
  try {
    const data = await apiFetch<PartnerResolveSuccess>(
      `/Partners/resolve?key=${encodeURIComponent(key)}`,
    );
    return { status: 'found', partner: data.partner, matchedBy: data.matchedBy };
  } catch (err) {
    const e = err as { status?: number; body?: unknown };
    if (e.status === 404) return { status: 'not-found' };
    if (e.status === 409) {
      const body = (e.body || {}) as PartnerResolveAmbiguous;
      return { status: 'ambiguous', candidates: body.candidates || [], matchedBy: body.matchedBy };
    }
    throw err;
  }
}

export function createPartner(data: Partial<ApiPartner>) {
  return apiFetch<ApiPartner>('/Partners', { method: 'POST', body: data });
}

export function updatePartner(id: string, data: Partial<ApiPartner>) {
  return apiFetch<ApiPartner>(`/Partners/${id}`, { method: 'PUT', body: data });
}

export function softDeletePartner(id: string) {
  return apiFetch<ApiPartner>(`/Partners/${id}/soft-delete`, { method: 'PATCH' });
}

export function hardDeletePartner(id: string) {
  return apiFetch<{ success: boolean; id: string }>(`/Partners/${id}/hard-delete`, { method: 'DELETE' });
}

export interface FaceCandidate {
  partnerId: string;
  name: string;
  code: string;
  phone: string;
  confidence: number;
}

export interface FaceMatchResult {
  match: FaceCandidate | null;
  candidates: FaceCandidate[];
}

export interface FaceRegisterResult {
  success: boolean;
  partnerId: string;
  sampleId: string;
  sampleCount: number;
  faceRegisteredAt: string;
}

export interface FaceStatusResult {
  partnerId: string;
  registered: boolean;
  sampleCount: number;
  lastRegisteredAt: string | null;
}

export function recognizeFace(image: Blob) {
  const formData = new FormData();
  formData.append('image', image, 'face.jpg');
  return apiFetch<FaceMatchResult>('/face/recognize', {
    method: 'POST',
    body: formData as unknown as Record<string, unknown>,
  });
}

export function registerFace(partnerId: string, image: Blob, source?: string) {
  const formData = new FormData();
  formData.append('partnerId', partnerId);
  formData.append('image', image, 'face.jpg');
  if (source) formData.append('source', source);
  return apiFetch<FaceRegisterResult>('/face/register', {
    method: 'POST',
    body: formData as unknown as Record<string, unknown>,
  });
}

export function getFaceStatus(partnerId: string) {
  return apiFetch<FaceStatusResult>(`/face/status/${encodeURIComponent(partnerId)}`);
}
