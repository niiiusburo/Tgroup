/**
 * Website CMS types re-exported from /types/
 * @crossref:used-in[Website, PageList, PageEditor, SEOManager]
 */

import type { WebsitePage, PageStatus, SEOMeta, ServiceListing } from '@/types/website';

export type { WebsitePage, PageStatus, SEOMeta, ServiceListing };

export const PAGE_STATUS_LABELS: Record<PageStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  scheduled: 'Scheduled',
  archived: 'Archived',
};

export const PAGE_STATUS_STYLES: Record<PageStatus, string> = {
  published: 'bg-green-100 text-green-700',
  draft: 'bg-yellow-100 text-yellow-700',
  scheduled: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-500',
};

export const PAGE_TEMPLATES = ['default', 'landing'] as const;
export const SERVICE_CATEGORIES = ['cleaning', 'treatment', 'cosmetic'] as const;

export const MOCK_PAGES: readonly WebsitePage[] = [];
export const MOCK_SERVICES: readonly ServiceListing[] = [];
