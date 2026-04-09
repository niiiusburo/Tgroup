/**
 * API Client - connects frontend to tdental-api backend
 * @crossref:used-in[useCustomers, useEmployees, useAppointments, useServices, usePayment, useLocations]
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

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

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;

  let url = `${API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = localStorage.getItem('tdental_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API ${method} ${endpoint} failed (${res.status}): ${text}`);
  }

  return res.json();
}

// ─── Partners (Customers) ─────────────────────────────────────────

export interface ApiPartner {
  id: string;
  code: string | null;
  displayname: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  street: string | null;
  city: string | null;
  district: string | null;
  ward: string | null;
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
  active?: boolean;
  wage?: number;
  allowance?: number;
  startworkdate?: string;
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
  hrjobid: string | null;
  hrjobname: string | null;
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
}) {
  return apiFetch<PaginatedResponse<ApiEmployee>>('/Employees', {
    params: {
      offset: params?.offset ?? 0,
      limit: params?.limit ?? 50,
      search: params?.search,
      companyId: params?.companyId,
      isDoctor: params?.isDoctor,
      isAssistant: params?.isAssistant,
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
  doctorid: string | null;
  doctorId: string | null; // camelCase for API requests
  doctorname: string | null;
  companyid: string | null;
  companyname: string | null;
  color: string | null;
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
}) {
  return apiFetch<PaginatedResponse<ApiProduct>>('/Products', {
    params: {
      offset: params?.offset ?? 0,
      limit: params?.limit ?? 200,
      search: params?.search,
      categId: params?.categId,
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
  companyid: string | null;
  companyname: string | null;
  doctorid: string | null;
  doctorname: string | null;
  amounttotal: string | null;
  residual: string | null;
  totalpaid: string | null;
  lastupdated: string | null;
}

export function fetchSaleOrders(params?: {
  offset?: number;
  limit?: number;
  search?: string;
  partnerId?: string;
  companyId?: string;
}) {
  return apiFetch<PaginatedResponse<ApiSaleOrder>>('/SaleOrders', {
    params: {
      offset: params?.offset ?? 0,
      limit: params?.limit ?? 50,
      search: params?.search,
      partnerId: params?.partnerId,
      companyId: params?.companyId,
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
  amounttotal?: number;
  datestart?: string;
  dateend?: string;
  notes?: string;
}) {
  return apiFetch<ApiSaleOrder>('/SaleOrders', { method: 'POST', body: data });
}

// ─── Dashboard Reports ────────────────────────────────────────────

export function fetchDashboardReports(params?: { companyId?: string }) {
  return apiFetch<Record<string, unknown>>('/DashboardReports', {
    params: { companyId: params?.companyId },
  });
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
  return apiFetch<LoginResponse>('/Auth/me');
}

// ─── Customer Balance ─────────────────────────────────────────────

export interface ApiCustomerBalance {
  id: string;
  name: string;
  depositBalance: number;
  outstandingBalance: number;
}

export async function fetchCustomerBalance(customerId: string): Promise<ApiCustomerBalance> {
  const res = await apiFetch<{ deposit_balance: number; outstanding_balance: number }>(`/CustomerBalance/${customerId}`);
  return {
    id: customerId,
    name: '',
    depositBalance: Number(res.deposit_balance) || 0,
    outstandingBalance: Number(res.outstanding_balance) || 0,
  };
}

// ─── Payments ────────────────────────────────────────────────────

export interface ApiPayment {
  id: string;
  customerId: string;
  serviceId?: string;
  amount: number;
  method: 'cash' | 'bank' | 'deposit';
  depositUsed?: number;
  cashAmount?: number;
  bankAmount?: number;
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
}

export async function fetchPayments(customerId?: string): Promise<{ items: ApiPayment[]; totalItems: number }> {
  const url = customerId ? `/Payments?customerId=${customerId}` : '/Payments';
  return apiFetch<{ items: ApiPayment[]; totalItems: number }>(url);
}

export async function createPayment(data: {
  customerId: string;
  serviceId?: string;
  amount: number;
  method: 'cash' | 'bank' | 'deposit';
  notes?: string;
}): Promise<ApiPayment> {
  return apiFetch<ApiPayment>('/Payments', {
    method: 'POST',
    body: {
      customer_id: data.customerId,
      service_id: data.serviceId,
      amount: data.amount,
      method: data.method,
      notes: data.notes,
    },
  });
}

// ─── Services (Sale Orders) ──────────────────────────────────────

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
