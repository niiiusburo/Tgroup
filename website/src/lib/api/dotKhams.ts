import { apiFetch, type PaginatedResponse } from './core';

// ─── DotKhams ─────────────────────────────────────────────────────

export interface ApiDotKham {
  id: string;
  name: string | null;
  date: string | null;
  totalamount: string | null;
  amountresidual: string | null;
  partnerid: string | null;
  partnername: string | null;
  companyid: string | null;
  companyname: string | null;
  doctorid: string | null;
  doctorname: string | null;
  assistantid: string | null;
  assistantname: string | null;
  assistantsecondaryid: string | null;
  assistantsecondaryname: string | null;
  note: string | null;
  state: string | null;
  paymentstate: string | null;
}

export function fetchDotKhams(params?: { partnerId?: string; limit?: number; offset?: number }) {
  return apiFetch<PaginatedResponse<ApiDotKham>>("/DotKhams", {
    params: {
      partner_id: params?.partnerId,
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
    },
  });
}

