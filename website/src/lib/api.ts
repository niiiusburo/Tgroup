/**
 * API Client - connects frontend to tgclinic-api backend
 * @crossref:used-in[useCustomers, useEmployees, useAppointments, useServices, usePayment, useLocations]
 */

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

export class ApiError extends Error {
  status: number;
  code?: string;
  field?: string;
  body?: unknown;

  constructor(init: { status: number; code?: string; field?: string; message: string; body?: unknown }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.field = init.field;
    this.body = init.body;
  }
}

export function getUploadUrl(relativePath: string): string {
  if (relativePath.startsWith('http')) return relativePath;
  const base = API_URL.replace(/\/?api$/, '');
  return `${base}${relativePath}`;
}

export interface PaginatedResponse<T> {
  offset: number;
  limit: number;
  totalItems: number;
  items: T[];
}

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

// Keys that bypass camelCase → snake_case conversion (backend expects them as-is)
const CAMEL_CASE_PASSTHROUGH = new Set(['isDoctor', 'isAssistant', 'isReceptionist', 'categId', 'companyId', 'sortField', 'sortOrder', 'saleOK']);

// Convert camelCase to snake_case for backend API compatibility
function toSnakeCase(str: string): string {
  if (CAMEL_CASE_PASSTHROUGH.has(str)) return str;
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;

  let url = `${API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        // Convert camelCase to snake_case for backend compatibility
        searchParams.set(toSnakeCase(key), String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const token = localStorage.getItem('tgclinic_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  if (!res.ok) {
    let parsed: unknown;
    try {
      parsed = await res.clone().json();
    } catch {
      // JSON parse failed — fall back to legacy string throw
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`API ${method} ${endpoint} failed (${res.status}): ${text}`);
    }

    // Structured error: { error: { code, field?, message } }
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'error' in parsed &&
      (parsed as Record<string, unknown>).error !== null &&
      typeof (parsed as Record<string, unknown>).error === 'object' &&
      'code' in ((parsed as Record<string, unknown>).error as Record<string, unknown>) &&
      'message' in ((parsed as Record<string, unknown>).error as Record<string, unknown>)
    ) {
      const e = (parsed as Record<string, unknown>).error as { code: string; field?: string; message: string };
      throw new ApiError({ status: res.status, code: e.code, field: e.field, message: e.message, body: parsed });
    }

    // Legacy string error: { error: "some string" }
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'error' in parsed &&
      typeof (parsed as Record<string, unknown>).error === 'string'
    ) {
      throw new ApiError({
        status: res.status,
        code: 'UNKNOWN',
        message: (parsed as Record<string, unknown>).error as string,
        body: parsed,
      });
    }

    // Unknown JSON shape — treat as UNKNOWN
    throw new ApiError({
      status: res.status,
      code: 'UNKNOWN',
      message: `API ${method} ${endpoint} failed (${res.status})`,
      body: parsed,
    });
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

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
  sourceid: string | null;
  sourcename: string | null;
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
}

export function fetchPartners(params?: {
  offset?: number;
  limit?: number;
  search?: string;
  companyId?: string;
}) {
  return apiFetch<PaginatedResponse<ApiPartner>>('/Partners', {
    params: {
      offset: params?.offset ?? 0,
      limit: params?.limit ?? 50,
      search: params?.search,
      companyId: params?.companyId,
    },
  });
}

export function fetchPartnerById(id: string) {
  return apiFetch<ApiPartner>(`/Partners/${id}`);
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

export interface FaceMatchResult {
  match: {
    partnerId: string;
    name: string;
    confidence: number;
  } | null;
}

export function recognizeFace(image: Blob) {
  const formData = new FormData();
  formData.append('image', image, 'face.jpg');
  return apiFetch<FaceMatchResult>('/face/recognize', {
    method: 'POST',
    body: formData as unknown as Record<string, unknown>,
  });
}

export function registerFace(partnerId: string, image: Blob) {
  const formData = new FormData();
  formData.append('partnerId', partnerId);
  formData.append('image', image, 'face.jpg');
  return apiFetch<{ success: boolean; faceSubjectId: string }>('/face/register', {
    method: 'POST',
    body: formData as unknown as Record<string, unknown>,
  });
}

// ─── Employees ────────────────────────────────────────────────────

// Employee-specific creation uses Partners API with employee=true
export interface CreateEmployeeData {
  name: string;
  phone?: string;
  email?: string;
  password?: string;
  companyid?: string;
  isdoctor?: boolean;
  isassistant?: boolean;
  isreceptionist?: boolean;
  jobtitle?: string;
  active?: boolean;
  wage?: number;
  allowance?: number;
  startworkdate?: string;
  locationScopeIds?: string[];
}

export function createEmployee(data: CreateEmployeeData) {
  return apiFetch<ApiEmployee>('/Employees', { method: 'POST', body: data });
}

export function updateEmployee(id: string, data: Partial<CreateEmployeeData>) {
  return apiFetch<ApiEmployee>(`/Employees/${id}`, { method: 'PUT', body: data });
}

export function deleteEmployee(id: string) {
  return apiFetch<void>(`/Employees/${id}`, { method: 'DELETE' });
}

export interface ApiEmployee {
  id: string;
  name: string;
  ref: string | null;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  isdoctor: boolean;
  isassistant: boolean;
  isreceptionist: boolean;
  active: boolean;
  companyid: string | null;
  companyname: string | null;
  locationScopeIds?: string[];
  hrjobid: string | null;
  hrjobname: string | null;
  jobtitle?: string | null;
  wage: string | null;
  allowance: string | null;
  startworkdate: string | null;
  datecreated: string | null;
  lastupdated: string | null;
}

export function fetchEmployees(params?: {
  offset?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  isDoctor?: boolean;
  isAssistant?: boolean;
  active?: 'true' | 'false' | 'all';
}) {
  return apiFetch<PaginatedResponse<ApiEmployee>>('/Employees', {
    params: {
      offset: params?.offset ?? 0,
      limit: params?.limit ?? 50,
      search: params?.search,
      companyId: params?.companyId,
      isDoctor: params?.isDoctor,
      isAssistant: params?.isAssistant,
      active: params?.active,
    },
  });
}

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
    },
  });
}

export function createAppointment(data: Partial<ApiAppointment>) {
  return apiFetch<ApiAppointment>('/Appointments', { method: 'POST', body: data });
}

export function updateAppointment(id: string, data: Partial<ApiAppointment>) {
  return apiFetch<ApiAppointment>(`/Appointments/${id}`, { method: 'PUT', body: data });
}

// ─── Companies (Locations) ────────────────────────────────────────

export interface ApiCompany {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  datecreated: string | null;
  lastupdated: string | null;
}

export function fetchCompanies(params?: { offset?: number; limit?: number }) {
  return apiFetch<PaginatedResponse<ApiCompany>>('/Companies', {
    params: { offset: params?.offset ?? 0, limit: params?.limit ?? 50 },
  });
}

// ─── Products (Services Catalog) ──────────────────────────────────

export interface ApiProduct {
  id: string;
  name: string;
  namenosign: string | null;
  defaultcode: string | null;
  type: string | null;
  type2: string | null;
  listprice: string | null;
  saleprice: string | null;
  purchaseprice: string | null;
  laboprice: string | null;
  categid: string | null;
  categname: string | null;
  categcompletename: string | null;
  uomid: string | null;
  uomname: string | null;
  companyid: string | null;
  companyname: string | null;
  canorderlab: boolean;
  active: boolean;
  datecreated: string | null;
  lastupdated: string | null;
}

export function fetchProducts(params?: {
  offset?: number;
  limit?: number;
  search?: string;
  categId?: string;
  companyId?: string;
}) {
  return apiFetch<PaginatedResponse<ApiProduct>>('/Products', {
    params: {
      offset: params?.offset ?? 0,
      limit: params?.limit ?? 200,
      search: params?.search,
      categId: params?.categId,
      companyId: params?.companyId,
    },
  });
}

export function createProduct(data: {
  name: string;
  defaultcode?: string;
  listprice?: number;
  categid?: string;
  uomname?: string;
  companyid?: string;
  canorderlab?: boolean;
}) {
  return apiFetch<ApiProduct>('/Products', { method: 'POST', body: data });
}

export function updateProduct(id: string, data: Partial<{
  name: string;
  defaultcode: string;
  listprice: number;
  categid: string;
  uomname: string;
  companyid: string;
  canorderlab: boolean;
  active: boolean;
}>) {
  return apiFetch<ApiProduct>(`/Products/${id}`, { method: 'PUT', body: data });
}

export function deleteProduct(id: string) {
  return apiFetch<void>(`/Products/${id}`, { method: 'DELETE' });
}

// ─── Product Categories ──────────────────────────────────────────

export interface ApiProductCategory {
  id: string;
  name: string;
  completename: string | null;
  parentid: string | null;
  active: boolean;
  product_count: number;
  datecreated: string | null;
  lastupdated: string | null;
}

export function fetchProductCategories(params?: { search?: string }) {
  return apiFetch<{ totalItems: number; items: ApiProductCategory[] }>('/ProductCategories', {
    params: { search: params?.search },
  });
}

export function createProductCategory(data: { name: string; parentid?: string }) {
  return apiFetch<ApiProductCategory>('/ProductCategories', { method: 'POST', body: data });
}

export function updateProductCategory(id: string, data: Partial<{ name: string; active: boolean }>) {
  return apiFetch<ApiProductCategory>(`/ProductCategories/${id}`, { method: 'PUT', body: data });
}

export function deleteProductCategory(id: string) {
  return apiFetch<void>(`/ProductCategories/${id}`, { method: 'DELETE' });
}

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
  quantity?: number;
  unit?: string;
  amounttotal?: number;
  datestart?: string;
  dateend?: string;
  notes?: string;
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
}) {
  return apiFetch<ApiSaleOrder>(`/SaleOrders/${id}`, { method: 'PATCH', body: data });
}

export function updateSaleOrderState(id: string, state: string) {
  return apiFetch<ApiSaleOrder>(`/SaleOrders/${id}/state`, { method: 'PATCH', body: { state } });
}

// ─── Permissions ──────────────────────────────────────────────────

export interface PermissionGroup {
  id: string;
  name: string;
  color: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
}

export interface EmployeePermission {
  employeeId: string;
  employeeName: string;
  groupId: string;
  groupName: string;
  groupColor: string;
  locScope: string;
  locations: { id: string; name: string }[];
  overrides: { grant: string[]; revoke: string[] };
}

export interface ResolvedPermission {
  employeeId: string;
  employeeName: string;
  group: { id: string; name: string; basePermissions: string[] };
  overrides: { grant: string[]; revoke: string[] };
  effectivePermissions: string[];
  locations: { id: string; name: string }[];
}

export function fetchPermissionGroups() {
  return apiFetch<PermissionGroup[]>('/Permissions/groups');
}

export function fetchEmployeePermissions() {
  return apiFetch<EmployeePermission[]>('/Permissions/employees');
}

export function updateEmployeePermission(employeeId: string, data: {
  groupId: string;
  locScope: string;
  locationIds: string[];
  overrides: { grant: string[]; revoke: string[] };
}) {
  return apiFetch<EmployeePermission>(`/Permissions/employees/${employeeId}`, { method: 'PUT', body: data });
}

export function resolveEmployeePermissions(employeeId: string) {
  return apiFetch<ResolvedPermission>(`/Permissions/resolve/${employeeId}`);
}

export function createPermissionGroup(data: { name: string; color: string; description: string; permissions: string[] }) {
  return apiFetch<PermissionGroup>('/Permissions/groups', { method: 'POST', body: data });
}

export function updatePermissionGroup(groupId: string, data: { name: string; color: string; description: string; permissions: string[] }) {
  return apiFetch<PermissionGroup>(`/Permissions/groups/${groupId}`, { method: 'PUT', body: data });
}

// ─── Auth ─────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  companyId: string;
  companyName: string;
}

export interface AuthPermissions {
  groupId: string;
  groupName: string;
  effectivePermissions: string[];
  locations: { id: string; name: string }[];
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  permissions: AuthPermissions;
}

export function login(email: string, password: string) {
  return apiFetch<LoginResponse>('/Auth/login', { method: 'POST', body: { email, password } });
}

export function fetchMe() {
  return apiFetch<LoginResponse>('/auth/me');
}

// ─── Customer Balance ─────────────────────────────────────────────

export interface ApiCustomerBalance {
  id: string;
  name: string;
  depositBalance: number;
  outstandingBalance: number;
  totalDeposited: number;
  totalUsed: number;
  totalRefunded: number;
}

export async function fetchCustomerBalance(customerId: string): Promise<ApiCustomerBalance> {
  const res = await apiFetch<{ deposit_balance: number; outstanding_balance: number; total_deposited?: number; total_used?: number; total_refunded?: number }>(`/CustomerBalance/${customerId}`);
  return {
    id: customerId,
    name: '',
    depositBalance: Number(res.deposit_balance) || 0,
    outstandingBalance: Number(res.outstanding_balance) || 0,
    totalDeposited: Number(res.total_deposited) || 0,
    totalUsed: Number(res.total_used) || 0,
    totalRefunded: Number(res.total_refunded) || 0,
  };
}

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

// ─── Payments ────────────────────────────────────────────────────

export interface ApiPaymentAllocation {
  id: string;
  invoiceId?: string;
  dotkhamId?: string;
  invoiceName?: string;
  invoiceCode?: string;
  dotkhamName?: string;
  invoiceTotal?: number;
  dotkhamTotal?: number;
  invoiceResidual?: number;
  dotkhamResidual?: number;
  allocatedAmount: number;
}

export interface ApiPayment {
  id: string;
  customerId: string;
  serviceId?: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'deposit' | 'mixed';
  depositUsed?: number;
  cashAmount?: number;
  bankAmount?: number;
  receiptNumber?: string;
  depositType?: 'deposit' | 'refund' | 'usage' | null;
  notes?: string;
  paymentDate?: string;
  referenceCode?: string;
  status?: 'posted' | 'voided';
  createdAt: string;
  allocations?: ApiPaymentAllocation[];
}

export async function fetchPayments(
  customerId?: string,
  type?: 'payments' | 'deposits' | 'all'
): Promise<{ items: ApiPayment[]; totalItems: number }> {
  const searchParams = new URLSearchParams();
  if (customerId) searchParams.set('customerId', customerId);
  if (type && type !== 'all') searchParams.set('type', type);
  searchParams.set('limit', '100');
  searchParams.set('offset', '0');
  return apiFetch<{ items: ApiPayment[]; totalItems: number }>(`/Payments?${searchParams.toString()}`);
}

export async function createPayment(data: {
  customerId: string;
  serviceId?: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'deposit' | 'mixed';
  notes?: string;
  paymentDate?: string;
  referenceCode?: string;
  status?: 'posted' | 'voided';
  depositUsed?: number;
  cashAmount?: number;
  bankAmount?: number;
  depositType?: 'deposit' | 'refund' | 'usage';
  allocations?: { invoice_id?: string; dotkham_id?: string; allocated_amount: number }[];
}): Promise<ApiPayment> {
  return apiFetch<ApiPayment>('/Payments', {
    method: 'POST',
    body: {
      customer_id: data.customerId,
      service_id: data.serviceId,
      amount: data.amount,
      method: data.method,
      notes: data.notes,
      payment_date: data.paymentDate,
      reference_code: data.referenceCode,
      status: data.status ?? 'posted',
      deposit_used: data.depositUsed ?? 0,
      cash_amount: data.cashAmount ?? 0,
      bank_amount: data.bankAmount ?? 0,
      deposit_type: data.depositType,
      allocations: data.allocations,
    },
  });
}

export async function voidPayment(id: string, reason?: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/Payments/${id}/void`, {
    method: 'POST',
    body: { reason },
  });
}

export async function fetchDeposits(params: {
  customerId: string;
  dateFrom?: string;
  dateTo?: string;
  receiptNumber?: string;
  type?: 'deposit' | 'refund' | 'all';
  limit?: number;
  offset?: number;
}): Promise<{ items: ApiPayment[]; totalItems: number }> {
  const searchParams = new URLSearchParams();
  searchParams.set('customerId', params.customerId);
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params.dateTo) searchParams.set('dateTo', params.dateTo);
  if (params.receiptNumber) searchParams.set('receiptNumber', params.receiptNumber);
  if (params.type) searchParams.set('type', params.type);
  searchParams.set('limit', String(params.limit ?? 100));
  searchParams.set('offset', String(params.offset ?? 0));
  return apiFetch<{ items: ApiPayment[]; totalItems: number }>(`/Payments/deposits?${searchParams.toString()}`);
}

export async function fetchDepositUsage(params: {
  customerId: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: ApiPayment[]; totalItems: number }> {
  const searchParams = new URLSearchParams();
  searchParams.set('customerId', params.customerId);
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params.dateTo) searchParams.set('dateTo', params.dateTo);
  searchParams.set('limit', String(params.limit ?? 100));
  searchParams.set('offset', String(params.offset ?? 0));
  return apiFetch<{ items: ApiPayment[]; totalItems: number }>(`/Payments/deposit-usage?${searchParams.toString()}`);
}

export async function createRefund(data: {
  customerId: string;
  amount: number;
  method: 'cash' | 'bank_transfer';
  notes?: string;
  paymentDate?: string;
}): Promise<ApiPayment> {
  return apiFetch<ApiPayment>('/Payments/refund', {
    method: 'POST',
    body: {
      customer_id: data.customerId,
      amount: data.amount,
      method: data.method,
      notes: data.notes,
      payment_date: data.paymentDate,
    },
  });
}

export async function updatePayment(
  id: string,
  data: Partial<{
    amount: number;
    method: 'cash' | 'bank_transfer' | 'deposit' | 'mixed';
    notes: string;
    paymentDate: string;
    referenceCode: string;
    status: 'posted' | 'voided';
  }>
): Promise<ApiPayment> {
  return apiFetch<ApiPayment>(`/Payments/${id}`, {
    method: 'PATCH',
    body: {
      amount: data.amount,
      method: data.method,
      notes: data.notes,
      payment_date: data.paymentDate,
      reference_code: data.referenceCode,
      status: data.status,
    },
  });
}

export async function deletePayment(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/Payments/${id}`, { method: 'DELETE' });
}

// ─── Services (DEAD CODE — routes/services.js is unused) ──────────
// The frontend does NOT import fetchServices or createService.
// Service records use fetchSaleOrders/createSaleOrder above.
// Service catalog uses fetchProducts/createProduct above.
// These wrappers call /api/Services which queries a non-existent
// public.services table. Safe to delete.

export interface ApiService {
  id: string;
  customerId: string;
  doctorId?: string;
  serviceType: string;
  unitPrice: number;
  totalAmount: number;
  status: 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
}

export async function fetchServices(customerId?: string): Promise<{ items: ApiService[]; totalItems: number }> {
  const url = customerId ? `/Services?customerId=${customerId}` : '/Services';
  return apiFetch<{ items: ApiService[]; totalItems: number }>(url);
}

export async function createService(data: {
  customerId: string;
  serviceType: string;
  unitPrice: number;
  quantity?: number;
  discount?: number;
  doctorId?: string;
  notes?: string;
}): Promise<ApiService> {
  return apiFetch<ApiService>('/Services', {
    method: 'POST',
    body: {
      customer_id: data.customerId,
      service_type: data.serviceType,
      unit_price: data.unitPrice,
      quantity: data.quantity || 1,
      discount: data.discount || 0,
      doctor_id: data.doctorId,
      notes: data.notes,
    },
  });
}

// ─── Monthly Plans ────────────────────────────────────────────────

export interface ApiMonthlyPlanItem {
  id: string;
  planId: string;
  invoiceId: string;
  invoiceName?: string;
  invoiceTotal?: number;
  invoiceResidual?: number;
  priority: number;
}

export interface ApiMonthlyPlan {
  id: string;
  customer_id: string;
  customer_name: string;
  company_id: string;
  treatment_description: string;
  total_amount: string;
  down_payment: string;
  installment_amount: string;
  number_of_installments: number;
  start_date: string;
  status: 'active' | 'completed' | 'defaulted' | 'draft';
  notes: string;
  installments: ApiInstallment[];
  items?: ApiMonthlyPlanItem[];
  created_at: string;
  updated_at: string;
}

export interface ApiInstallment {
  id: string;
  plan_id: string;
  installment_number: number;
  due_date: string;
  amount: string;
  status: 'paid' | 'upcoming' | 'overdue' | 'pending';
  paid_date: string | null;
  paid_amount: string | null;
}

export interface MonthlyPlanSummary {
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  totalOutstanding: number;
  overdueCount: number;
}

export interface MonthlyPlansResponse {
  items: ApiMonthlyPlan[];
  aggregates: MonthlyPlanSummary;
}

export function fetchMonthlyPlans(params?: {
  companyId?: string;
  status?: string;
  customerId?: string;
  search?: string;
}) {
  return apiFetch<MonthlyPlansResponse>('/MonthlyPlans', {
    params: {
      company_id: params?.companyId,
      status: params?.status,
      customer_id: params?.customerId,
      search: params?.search,
    },
  });
}

export function fetchMonthlyPlanById(id: string) {
  return apiFetch<ApiMonthlyPlan>(`/MonthlyPlans/${id}`);
}

export function createMonthlyPlan(data: {
  customer_id: string;
  company_id?: string;
  treatment_description: string;
  total_amount: number;
  down_payment?: number;
  number_of_installments: number;
  start_date: string;
  notes?: string;
  invoice_ids?: string[];
}) {
  return apiFetch<ApiMonthlyPlan>('/MonthlyPlans', { method: 'POST', body: data });
}

export function updateMonthlyPlan(id: string, data: Partial<{
  treatment_description: string;
  total_amount: number;
  down_payment: number;
  status: string;
  notes: string;
  invoice_ids?: string[];
}>) {
  return apiFetch<ApiMonthlyPlan>(`/MonthlyPlans/${id}`, { method: 'PUT', body: data });
}

export function deleteMonthlyPlan(id: string) {
  return apiFetch<void>(`/MonthlyPlans/${id}`, { method: 'DELETE' });
}

export function markInstallmentPaid(planId: string, installmentId: string, data?: {
  paid_amount?: number;
  paid_date?: string;
}) {
  return apiFetch<ApiInstallment>(`/MonthlyPlans/${planId}/installments/${installmentId}/pay`, {
    method: 'PUT',
    body: data,
  });
}

// ─── Customer Sources ─────────────────────────────────────────────

export interface ApiCustomerSource {
  id: string;
  name: string;
  type: 'online' | 'offline' | 'referral';
  description: string;
  is_active: boolean;
  customer_count: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerSourcesResponse {
  items: ApiCustomerSource[];
  aggregates: {
    total: number;
    active: number;
    totalCustomers: number;
    topSource: string;
  };
}

export function fetchCustomerSources(params?: {
  type?: string;
  is_active?: boolean;
}) {
  return apiFetch<CustomerSourcesResponse>('/CustomerSources', {
    params: {
      type: params?.type,
      is_active: params?.is_active,
    },
  });
}

export function createCustomerSource(data: {
  name: string;
  type?: string;
  description?: string;
  is_active?: boolean;
}) {
  return apiFetch<ApiCustomerSource>('/CustomerSources', { method: 'POST', body: data });
}

export function updateCustomerSource(id: string, data: Partial<{
  name: string;
  type: string;
  description: string;
  is_active: boolean;
}>) {
  return apiFetch<ApiCustomerSource>(`/CustomerSources/${id}`, { method: 'PUT', body: data });
}

export function deleteCustomerSource(id: string) {
  return apiFetch<void>(`/CustomerSources/${id}`, { method: 'DELETE' });
}

// ─── System Preferences ───────────────────────────────────────────

export interface ApiSystemPreference {
  id: string;
  key: string;
  value: string;
  type: string;
  category: string;
  description: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemPreferencesResponse {
  items: ApiSystemPreference[];
  groups: Record<string, ApiSystemPreference[]>;
  aggregates: {
    total: number;
    categories: number;
  };
}

export function fetchSystemPreferences(params?: {
  category?: string;
  key?: string;
  is_public?: boolean;
}) {
  return apiFetch<SystemPreferencesResponse>('/SystemPreferences', {
    params: {
      category: params?.category,
      key: params?.key,
      is_public: params?.is_public,
    },
  });
}

export function fetchSystemPreference(key: string) {
  return apiFetch<ApiSystemPreference>(`/SystemPreferences/${key}`);
}

export function upsertSystemPreference(data: {
  key: string;
  value: string;
  type?: string;
  category?: string;
  description?: string;
  is_public?: boolean;
}) {
  return apiFetch<ApiSystemPreference>('/SystemPreferences', { method: 'POST', body: data });
}

export function updateSystemPreference(key: string, data: Partial<{
  value: string;
  type: string;
  category: string;
  description: string;
  is_public: boolean;
}>) {
  return apiFetch<ApiSystemPreference>(`/SystemPreferences/${key}`, { method: 'PUT', body: data });
}

export function deleteSystemPreference(key: string) {
  return apiFetch<void>(`/SystemPreferences/${key}`, { method: 'DELETE' });
}

// ─── Website Pages ────────────────────────────────────────────────

export interface ApiWebsitePage {
  id: string;
  company_id: string;
  title: string;
  slug: string;
  status: 'published' | 'draft' | 'scheduled' | 'archived';
  content: string;
  template: string;
  author: string;
  seo: {
    title: string;
    description: string;
    keywords: readonly string[];
    ogImage: string;
    canonicalUrl: string;
  };
  views: number;
  created_at: string;
  updated_at: string;
}

export interface WebsitePagesResponse {
  items: ApiWebsitePage[];
  aggregates: {
    total: number;
    published: number;
    draft: number;
    scheduled: number;
  };
}

export function fetchWebsitePages(params?: {
  companyId?: string;
  status?: string;
  search?: string;
}) {
  return apiFetch<WebsitePagesResponse>('/WebsitePages', {
    params: {
      company_id: params?.companyId,
      status: params?.status,
      search: params?.search,
    },
  });
}

export function fetchWebsitePage(id: string) {
  return apiFetch<ApiWebsitePage>(`/WebsitePages/${id}`);
}

export function createWebsitePage(data: {
  company_id?: string;
  title: string;
  slug: string;
  status?: string;
  content?: string;
  template?: string;
  author?: string;
  seo?: ApiWebsitePage['seo'];
}) {
  return apiFetch<ApiWebsitePage>('/WebsitePages', { method: 'POST', body: data });
}

export function updateWebsitePage(id: string, data: Partial<{
  title: string;
  slug: string;
  status: string;
  content: string;
  template: string;
  author: string;
  seo: ApiWebsitePage['seo'];
  views: number;
}>) {
  return apiFetch<ApiWebsitePage>(`/WebsitePages/${id}`, { method: 'PUT', body: data });
}

export function deleteWebsitePage(id: string) {
  return apiFetch<void>(`/WebsitePages/${id}`, { method: 'DELETE' });
}

export async function uploadPaymentProof(
  paymentId: string,
  proofImageBase64: string,
  qrDescription?: string
): Promise<{ success: boolean; proofId?: number }> {
  return apiFetch<{ success: boolean; proofId?: number }>(`/Payments/${paymentId}/proof`, {
    method: 'POST',
    body: { proofImageBase64, qrDescription },
  });
}

// ─── External Checkups (hosoonline.com integration) ───────────────

export interface ExternalCheckupImage {
  url: string;
  thumbnailUrl?: string;
  label?: string;
  uploadedAt?: string;
}

export interface ExternalCheckup {
  id: string;
  date: string;
  title: string;
  notes?: string;
  doctor?: string;
  nextAppointmentDate?: string | null;
  nextDescription?: string;
  images: ExternalCheckupImage[];
}

export interface ExternalCheckupsResponse {
  patientCode: string;
  patientName: string;
  source?: string;
  checkups: ExternalCheckup[];
}

export function fetchExternalCheckups(customerCode: string): Promise<ExternalCheckupsResponse> {
  return apiFetch<ExternalCheckupsResponse>(`/ExternalCheckups/${encodeURIComponent(customerCode)}`);
}

export interface CreateExternalCheckupData {
  title?: string;
  doctor?: string;
  date?: string;
  notes?: string;
  nextAppointmentDate?: string;
  nextDescription?: string;
  files?: File[];
}

export async function createExternalCheckup(
  customerCode: string,
  data: CreateExternalCheckupData
): Promise<{ checkup: ExternalCheckup }> {
  const form = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'files' && Array.isArray(value)) {
      value.forEach((file) => form.append('files', file));
    } else {
      form.append(key, String(value));
    }
  });

  const token = localStorage.getItem('tgclinic_token');
  const authHeaders: Record<string, string> = {};
  if (token) authHeaders['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/ExternalCheckups/${encodeURIComponent(customerCode)}/health-checkups`, {
    method: 'POST',
    headers: authHeaders,
    body: form,
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Upload failed');
    throw new Error(text);
  }
  return res.json();
}

// ─── Feedback ─────────────────────────────────────────────────────

import type {
  FeedbackStatus,
  FeedbackThread,
  AdminFeedbackThread,
  FeedbackMessage,
  FeedbackThreadDetail,
} from '@/types/feedback';

export async function fetchMyFeedback(): Promise<{ items: FeedbackThread[] }> {
  return apiFetch('/Feedback/my');
}

export async function fetchMyFeedbackThread(threadId: string): Promise<FeedbackThreadDetail> {
  return apiFetch(`/Feedback/my/${encodeURIComponent(threadId)}`);
}

export async function createFeedback(data: {
  content: string;
  pagePath?: string;
  screenSize?: string;
  files?: File[];
}): Promise<FeedbackThread> {
  const { files, ...rest } = data;
  if (files && files.length > 0) {
    const form = new FormData();
    form.append('content', rest.content);
    if (rest.pagePath) form.append('pagePath', rest.pagePath);
    if (rest.screenSize) form.append('screenSize', rest.screenSize);
    files.forEach((file) => form.append('files', file));
    return apiFetch('/Feedback', { method: 'POST', body: form as unknown as Record<string, unknown> });
  }
  return apiFetch('/Feedback', { method: 'POST', body: rest });
}

export async function replyToMyFeedbackThread(
  threadId: string,
  content: string,
  files?: File[]
): Promise<FeedbackMessage> {
  if (files && files.length > 0) {
    const form = new FormData();
    form.append('content', content);
    files.forEach((file) => form.append('files', file));
    return apiFetch(`/Feedback/my/${encodeURIComponent(threadId)}/reply`, {
      method: 'POST',
      body: form as unknown as Record<string, unknown>,
    });
  }
  return apiFetch(`/Feedback/my/${encodeURIComponent(threadId)}/reply`, {
    method: 'POST',
    body: { content },
  });
}

export async function fetchAllFeedback(): Promise<{ items: AdminFeedbackThread[] }> {
  return apiFetch('/Feedback/all');
}

export async function fetchAdminFeedbackThread(threadId: string): Promise<FeedbackThreadDetail> {
  return apiFetch(`/Feedback/all/${encodeURIComponent(threadId)}`);
}

export async function replyToFeedbackThread(
  threadId: string,
  content: string,
  files?: File[]
): Promise<FeedbackMessage> {
  if (files && files.length > 0) {
    const form = new FormData();
    form.append('content', content);
    files.forEach((file) => form.append('files', file));
    return apiFetch(`/Feedback/all/${encodeURIComponent(threadId)}/reply`, {
      method: 'POST',
      body: form as unknown as Record<string, unknown>,
    });
  }
  return apiFetch(`/Feedback/all/${encodeURIComponent(threadId)}/reply`, {
    method: 'POST',
    body: { content },
  });
}

export async function updateFeedbackStatus(
  threadId: string,
  status: FeedbackStatus
): Promise<FeedbackThread> {
  return apiFetch(`/Feedback/all/${encodeURIComponent(threadId)}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

export async function deleteFeedbackThread(threadId: string): Promise<void> {
  return apiFetch(`/Feedback/all/${encodeURIComponent(threadId)}`, {
    method: 'DELETE',
  });
}
