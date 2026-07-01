/**
 * @crossref:domain[integrations]
 * @crossref:used-in[hosoonline checkups API client; website/src/lib/api.ts (barrel), website/src/hooks/useExternalCheckups.ts, website/src/components/customer/HealthCheckupUploadForm.tsx, website/src/components/customer/HealthCheckupGallery.tsx, website/src/components/customer/AuthenticatedCheckupImage.tsx]
 * @crossref:uses[website/src/lib/api/core.ts, website/src/lib/authToken.ts, api/src/routes/externalCheckups.js, product-map/domains/integrations.yaml]
 * Calls /api/ExternalCheckups/* (hosoonline.com proxy); image blobs use raw fetch (external URLs), upload uses apiFetch.
 */
import { getAuthToken } from '@/lib/authToken';
import { apiFetch, API_URL } from './core';

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
  patientExists?: boolean;
  suggestedPatientCode?: string;
  source?: string;
  status?: number;
  message?: string;
  checkups: ExternalCheckup[];
}

function extractExternalCheckupError(text: string, fallback: string): string {
  if (!text) return fallback;
  try {
    const data = JSON.parse(text) as { error?: string; detail?: string; message?: string };
    const detail = data.detail || data.message || data.error;
    if (!detail) return fallback;

    if (detail.trim().startsWith('{')) {
      try {
        const nested = JSON.parse(detail) as { message?: string; error?: string };
        return nested.message || nested.error || detail;
      } catch {
        return detail;
      }
    }

    return detail;
  } catch {
    return text;
  }
}

export function fetchExternalCheckups(customerCode: string, lob?: 'dental' | 'cosmetic'): Promise<ExternalCheckupsResponse> {
  return apiFetch<ExternalCheckupsResponse>(`/ExternalCheckups/${encodeURIComponent(customerCode)}`, { lob });
}

export interface ExternalPatientCreateResponse {
  patient: {
    id?: string;
    code: string;
    fullName: string;
  };
  created: boolean;
  conflict?: boolean;
  patientCode: string;
  suggestedPatientCode: string;
}

export function createExternalPatient(
  customerCode: string,
  lob?: 'dental' | 'cosmetic'
): Promise<ExternalPatientCreateResponse> {
  return apiFetch<ExternalPatientCreateResponse>(`/ExternalCheckups/${encodeURIComponent(customerCode)}/patient`, {
    method: 'POST',
    lob,
  });
}

export function resolveExternalCheckupImageUrl(imagePath: string): string {
  if (imagePath.startsWith('http')) {
    // Fix mixed-content: rewrite hosoonline http:// to https://
    return imagePath.replace(/^http:\/\//i, 'https://');
  }

  if (imagePath.startsWith('/api/')) {
    return `${API_URL.replace(/\/api$/, '')}${imagePath}`;
  }

  if (imagePath.startsWith('/')) {
    return `${API_URL}${imagePath}`;
  }

  return `${API_URL}/${imagePath}`;
}

export async function fetchExternalCheckupImageBlob(imagePath: string, signal?: AbortSignal): Promise<Blob> {
  const token = getAuthToken();
  const res = await fetch(resolveExternalCheckupImageUrl(imagePath), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Image load failed');
    throw new Error(`External checkup image failed (${res.status}): ${text}`);
  }

  return res.blob();
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
  data: CreateExternalCheckupData,
  lob?: 'dental' | 'cosmetic',
): Promise<{ checkup: ExternalCheckup }> {
  const form = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'files' && Array.isArray(value)) {
      value.forEach((file) => form.append('photos', file));
    } else {
      form.append(key, String(value));
    }
  });

  try {
    return await apiFetch<{ checkup: ExternalCheckup }>(
      `/ExternalCheckups/${encodeURIComponent(customerCode)}/health-checkups`,
      { method: 'POST', body: form, lob },
    );
  } catch (err) {
    // apiFetch throws ApiError for non-ok responses; re-extract nested
    // hosoonline error messages for backward-compatible caller UX.
    if (err instanceof Error && 'body' in err) {
      const body = (err as { body?: unknown }).body;
      if (typeof body === 'string') {
        throw new Error(extractExternalCheckupError(body, err.message));
      }
      if (body && typeof body === 'object') {
        throw new Error(
          extractExternalCheckupError(JSON.stringify(body), err.message),
        );
      }
    }
    throw err;
  }
}
