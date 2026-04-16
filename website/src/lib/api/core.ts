/**
 * API Client core - fetch wrapper, error handling, and shared types
 * @crossref:used-in[lib/api/* domain modules]
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
  signal?: AbortSignal;
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
    signal: options.signal,
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
