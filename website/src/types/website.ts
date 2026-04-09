/**
 * Website CMS type definitions
 * @crossref:used-in[Website, PageList, PageEditor, SEOManager, ServiceCatalogManager]
 */

export type PageStatus = 'published' | 'draft' | 'scheduled' | 'archived';

export interface SEOMeta {
  readonly title: string;
  readonly description: string;
  readonly keywords: readonly string[];
  readonly ogImage: string;
  readonly canonicalUrl: string;
}

export interface WebsitePage {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly status: PageStatus;
  readonly content: string;
  readonly lastModified: string;
  readonly author: string;
  readonly template: string;
  readonly seo: SEOMeta;
  readonly views: number;
}

export interface ServiceListing {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly category: string;
  readonly description: string;
  readonly price: string;
  readonly duration: string;
  readonly featured: boolean;
  readonly visible: boolean;
  readonly sortOrder: number;
  readonly image: string;
}

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
