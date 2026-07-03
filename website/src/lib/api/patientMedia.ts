/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[website/src/components/customer/ServiceMediaGallery.tsx, website/src/lib/api.ts (barrel)]
 * @crossref:uses[website/src/lib/api/core.ts, api/src/routes/media.js, product-map/domains/patient-portal.yaml]
 * Staff-facing patient media API: list, upload, and delete photos tied to a service line.
 */
import { apiFetch } from './core';

export interface PatientMediaItem {
  id: string;
  mediaServiceId?: string;
  mediaUrl?: string;
  signedUrl?: string;
  type: 'before' | 'after' | 'xray' | 'other' | string;
  category?: string;
  label?: string;
  saleOrderLineId?: string | null;
  createdAt?: string;
}

export interface PatientMediaListResponse {
  success: boolean;
  client?: { id: string };
  media: PatientMediaItem[];
}

export interface PatientMediaUploadResponse {
  success: boolean;
  client?: { id: string };
  media: PatientMediaItem;
}

export function listServiceMedia(
  partnerId: string,
  saleOrderLineId?: string,
  lob?: 'dental' | 'cosmetic',
): Promise<PatientMediaListResponse> {
  return apiFetch<PatientMediaListResponse>('/media', {
    params: { partnerId, saleOrderLineId: saleOrderLineId || undefined },
    lob,
  });
}

export function uploadServiceMedia(
  partnerId: string,
  saleOrderLineId: string | undefined,
  file: File,
  type: 'before' | 'after' | 'xray' | 'other' | string,
  label?: string,
  lob?: 'dental' | 'cosmetic',
): Promise<PatientMediaUploadResponse> {
  const form = new FormData();
  form.append('file', file);
  form.append('partnerId', partnerId);
  if (saleOrderLineId) form.append('saleOrderLineId', saleOrderLineId);
  form.append('type', type);
  if (label) form.append('label', label);

  return apiFetch<PatientMediaUploadResponse>('/media', {
    method: 'POST',
    body: form,
    lob,
  });
}

export function deleteMedia(
  mediaId: string,
  lob?: 'dental' | 'cosmetic',
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/media/${encodeURIComponent(mediaId)}`, {
    method: 'DELETE',
    lob,
  });
}
