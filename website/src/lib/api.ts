/**
 * API Client - connects frontend to tgclinic-api backend
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

// Convert camelCase to snake_case for backend API compatibility
function toSnakeCase(str: string): string {
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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = localStorage.getItem('tgclinic_token');
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

export function softDeletePartner(id: string) {
  return apiFetch<ApiPartner>(`/Partners/${id}/soft-delete`, { method: 'PATCH' });
}

export function hardDeletePartner(id: string) {
  return apiFetch<{ success: boolean; id: string }>(`/Partners/${id}/hard-delete`, { method: 'DELETE' });
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
  return apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: { email, password } });
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
  notes?: string;
  paymentDate?: string;
  referenceCode?: string;
  status?: 'posted' | 'voided';
  createdAt: string;
  allocations?: ApiPaymentAllocation[];
}

export async function fetchPayments(customerId?: string): Promise<{ items: ApiPayment[]; totalItems: number }> {
  const url = customerId ? `/Payments?customerId=${customerId}` : '/Payments';
  return apiFetch<{ items: ApiPayment[]; totalItems: number }>(url);
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
