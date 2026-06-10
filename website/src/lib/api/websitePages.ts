/**
 * @crossref:domain[feedback-cms]
 * @crossref:used-in[Website pages CMS API client; website/src/lib/api.ts (barrel), website/src/hooks/useWebsiteData.ts, website/src/components/payment/VietQrModal.tsx (uploadPaymentProof)]
 * @crossref:uses[website/src/lib/api/core.ts, api/src/routes/websitePages.js, api/src/routes/payments.js (POST /api/Payments/:id/proof), product-map/domains/feedback-cms.yaml]
 * Calls /api/WebsitePages CRUD; uploadPaymentProof posts to /api/Payments/:id/proof.
 */
import { apiFetch } from './core';

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

