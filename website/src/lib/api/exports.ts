import { apiFetch, API_URL } from './core';

export interface ExportPreviewResponse {
  type: string;
  label: string;
  rowCount: number;
  filename: string;
  filters: Record<string, unknown>;
  summary: Array<{ label: string; value: string | number }>;
  exceedsMax: boolean;
}

export interface ExportTypeInfo {
  key: string;
  label: string;
  permission: string;
}

export async function previewExport(
  type: string,
  filters: Record<string, unknown>
): Promise<ExportPreviewResponse> {
  return apiFetch(`/Exports/${type}/preview`, {
    method: 'POST',
    body: { filters },
  });
}

export async function downloadExport(
  type: string,
  filters: Record<string, unknown>
): Promise<Blob> {
  const token = localStorage.getItem('tgclinic_token') || '';
  const res = await fetch(
    `${API_URL}/Exports/${type}/download`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ filters }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Export failed' }));
    throw new Error(err.error || `Export failed: ${res.status}`);
  }
  return res.blob();
}

export async function fetchExportTypes(): Promise<ExportTypeInfo[]> {
  return apiFetch('/Exports/types');
}
