import { apiFetch, type PaginatedResponse } from './core';

// ─── Appointments ─────────────────────────────────────────────────

export interface ApiAppointment {
  id: string;
  name: string | null;
  date: string;
  time: string | null;
  datetimeappointment: string | null;
  timeexpected: number | null;
  timeExpected: number | null; // camelCase for API requests
  note: string | null;
  state: string | null;
  reason: string | null;
  partnerid: string | null;
  partnername: string | null;
  partnerdisplayname: string | null;
  partnerphone: string | null;
  partnercode: string | null;
  doctorid: string | null;
  doctorId: string | null; // camelCase for API requests
  doctorname: string | null;
  companyid: string | null;
  companyname: string | null;
  color: string | null;
  productid: string | null;
  productname: string | null;
  datecreated: string | null;
  lastupdated: string | null;
  datetimearrived: string | null;
  datetimeseated: string | null;
  datetimedismissed: string | null;
  datedone: string | null;
  // Assistant and dental aide (optional)
  assistantid: string | null;
  assistantname: string | null;
  dentalaideid: string | null;
  dentalaidename: string | null;
}

export function fetchAppointments(params?: {
  offset?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  dateFrom?: string;
  dateTo?: string;
  state?: string;
  doctorId?: string;
  partnerId?: string;
  calendarMode?: boolean;
  includeCounts?: boolean;
}) {
  return apiFetch<PaginatedResponse<ApiAppointment>>('/Appointments', {
    params: {
      offset: params?.offset ?? 0,
      limit: params?.limit ?? 50,
      search: params?.search,
      companyId: params?.companyId,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
      state: params?.state,
      doctorId: params?.doctorId,
      partnerId: params?.partnerId,
      calendarMode: params?.calendarMode,
      includeCounts: params?.includeCounts,
    },
  });
}

export function createAppointment(data: Partial<ApiAppointment>) {
  return apiFetch<ApiAppointment>('/Appointments', { method: 'POST', body: data });
}

export function updateAppointment(id: string, data: Partial<ApiAppointment>) {
  return apiFetch<ApiAppointment>(`/Appointments/${id}`, { method: 'PUT', body: data });
}
