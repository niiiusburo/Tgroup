import { apiFetch, API_URL } from './core';

// ─── External Checkups (hosoonline.com integration) ───────────────
const TOKEN_KEY = 'tgclinic_token';

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

export function fetchExternalCheckups(customerCode: string): Promise<ExternalCheckupsResponse> {
  return apiFetch<ExternalCheckupsResponse>(`/ExternalCheckups/${encodeURIComponent(customerCode)}`);
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

export function createExternalPatient(customerCode: string): Promise<ExternalPatientCreateResponse> {
  return apiFetch<ExternalPatientCreateResponse>(`/ExternalCheckups/${encodeURIComponent(customerCode)}/patient`, {
    method: 'POST',
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

function getExternalCheckupAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function getExternalCheckupAuthHeaders(): Record<string, string> {
  const token = getExternalCheckupAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchExternalCheckupImageBlob(imagePath: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(resolveExternalCheckupImageUrl(imagePath), {
    headers: getExternalCheckupAuthHeaders(),
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
  data: CreateExternalCheckupData
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

  const res = await fetch(`${API_URL}/ExternalCheckups/${encodeURIComponent(customerCode)}/health-checkups`, {
    method: 'POST',
    headers: getExternalCheckupAuthHeaders(),
    body: form,
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Upload failed');
    throw new Error(extractExternalCheckupError(text, 'Upload failed'));
  }
  return res.json();
}
