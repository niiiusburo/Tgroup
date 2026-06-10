/**
 * @crossref:domain[reports-analytics]
 * @crossref:used-in[Exports API client; website/src/components/shared/ExportPreviewModal.tsx, website/src/hooks/useExport.ts]
 * @crossref:uses[website/src/lib/api/core.ts, website/src/lib/authToken.ts, api/src/routes/exports.js, product-map/domains/reports-analytics.yaml]
 * Calls /api/Exports/:type preview/download/types; download uses raw fetch for Blob.
 */
import { getAuthToken } from '@/lib/authToken';
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
  filters: Record<string, unknown>,
  lob?: 'dental' | 'cosmetic'
): Promise<ExportPreviewResponse> {
  return apiFetch(`/Exports/${type}/preview`, {
    method: 'POST',
    body: { filters },
    lob,
  });
}

export async function downloadExport(
  type: string,
  filters: Record<string, unknown>,
  lob?: 'dental' | 'cosmetic'
): Promise<Blob> {
  const token = getAuthToken() || '';
  const lobPrefix = lob === 'cosmetic' ? '/cosmetic' : '';
  const res = await fetch(
    `${API_URL}${lobPrefix}/Exports/${type}/download`,
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
