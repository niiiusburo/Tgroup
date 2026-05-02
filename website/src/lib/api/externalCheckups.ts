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
  source?: string;
  status?: number;
  message?: string;
  checkups: ExternalCheckup[];
}

export function fetchExternalCheckups(customerCode: string): Promise<ExternalCheckupsResponse> {
  return apiFetch<ExternalCheckupsResponse>(`/ExternalCheckups/${encodeURIComponent(customerCode)}`);
}

export function resolveExternalCheckupImageUrl(imagePath: string): string {
  if (imagePath.startsWith('http')) return imagePath;

  if (imagePath.startsWith('/api/')) {
    return `${API_URL.replace(/\/api$/, '')}${imagePath}`;
  }

  if (imagePath.startsWith('/')) {
    return `${API_URL}${imagePath}`;
  }

  return `${API_URL}/${imagePath}`;
}

export async function fetchExternalCheckupImageBlob(imagePath: string, signal?: AbortSignal): Promise<Blob> {
  const token = localStorage.getItem('tgclinic_token');
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(resolveExternalCheckupImageUrl(imagePath), {
    headers,
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
