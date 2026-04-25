import { apiFetch, type PaginatedResponse } from './core';

// ─── Sale Orders ──────────────────────────────────────────────────

export interface ApiSaleOrder {
  id: string;
  name: string | null;
  datecreated: string | null;
  state: string | null;
  partnerid: string | null;
  partnername: string | null;
  partnerdisplayname: string | null;
  companyid: string | null;
  companyname: string | null;
  doctorid: string | null;
  doctorname: string | null;
  assistantid: string | null;
  assistantname: string | null;
  dentalaideid: string | null;
  dentalaidename: string | null;
  productid: string | null;
  productname: string | null;
  quantity: string | null;
  unit: string | null;
  amounttotal: string | null;
  residual: string | null;
  totalpaid: string | null;
  datestart: string | null;
  dateend: string | null;
  notes: string | null;
  tooth_numbers: string | null;
  tooth_comment: string | null;
  sourceid: string | null;
  sourcename: string | null;
  lastupdated: string | null;
  isdeleted?: boolean;
  /** Sale order reference code (e.g. SO-2024-001). */
  code?: string | null;
  ref?: string | null;
  origin?: string | null;
}

export function fetchSaleOrders(params?: {
  offset?: number;
  limit?: number;
  search?: string;
  partnerId?: string;
  companyId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return apiFetch<PaginatedResponse<ApiSaleOrder>>('/SaleOrders', {
    params: {
      offset: params?.offset ?? 0,
      limit: params?.limit ?? 50,
      search: params?.search,
      partnerId: params?.partnerId,
      companyId: params?.companyId,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
    },
  });
}

export function createSaleOrder(data: {
  partnerid?: string;
  partnername?: string;
  companyid?: string;
  productid?: string;
  productname?: string;
  doctorid?: string;
  doctorname?: string;
  assistantid?: string | null;
  dentalaideid?: string | null;
  quantity?: number;
  unit?: string;
  amounttotal?: number;
  datestart?: string;
  dateend?: string;
  notes?: string;
  tooth_numbers?: string | null;
  tooth_comment?: string | null;
}) {
  return apiFetch<ApiSaleOrder>('/SaleOrders', { method: 'POST', body: data });
}

export function updateSaleOrder(id: string, data: {
  partnerid?: string | null;
  partnername?: string | null;
  companyid?: string | null;
  productid?: string | null;
  productname?: string | null;
  doctorid?: string | null;
  doctorname?: string | null;
  assistantid?: string | null;
  assistantname?: string | null;
  dentalaideid?: string | null;
  dentalaidename?: string | null;
  quantity?: number | null;
  unit?: string | null;
  amounttotal?: number;
  datestart?: string | null;
  dateend?: string | null;
  notes?: string | null;
  tooth_numbers?: string | null;
  tooth_comment?: string | null;
}) {
  return apiFetch<ApiSaleOrder>(`/SaleOrders/${id}`, { method: 'PATCH', body: data });
}

export function updateSaleOrderState(id: string, state: string) {
  return apiFetch<ApiSaleOrder>(`/SaleOrders/${id}/state`, { method: 'PATCH', body: { state } });
}

// ─── Sale Order Lines (service lines) ─────────────────────────────

export interface ApiSaleOrderLine {
  id: string;
  productid: string | null;
  productname: string | null;
  productuomqty: string | null;
  priceunit: string | null;
  pricetotal: string | null;
  pricesubtotal: string | null;
  discount: string | null;
  amountpaid: string | null;
  amountresidual: string | null;
  date: string | null;
  tooth_numbers: string | null;
  toothtype: string | null;
  diagnostic: string | null;
  note: string | null;
  sequence: string | null;
  linestate: string | null;
  iscancelled: boolean | null;
  employeeid: string | null;
  assistantid: string | null;
  orderid: string | null;
  ordername: string | null;
  ordercode: string | null;
  so_amounttotal: string | null;
  so_residual: string | null;
  so_totalpaid: string | null;
  sostate: string | null;
  doctorname: string | null;
  assistantname: string | null;
  companyname: string | null;
  paid_amount: string | null;
  order_line_count: string | number | null;
}

export function fetchSaleOrderLines(params?: {
  partnerId?: string;
  offset?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: string;
}) {
  return apiFetch<PaginatedResponse<ApiSaleOrderLine>>('/SaleOrders/lines', {
    params: {
      partner_id: params?.partnerId,
      offset: params?.offset ?? 0,
      limit: params?.limit ?? 100,
      sortField: params?.sortField ?? 'date',
      sortOrder: params?.sortOrder ?? 'desc',
    },
  });
}
