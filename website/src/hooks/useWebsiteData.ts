/**
 * Website CMS state management hook
 * Uses real backend API for page management
 * @crossref:used-in[Website]
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import type { WebsitePage, PageStatus } from '@/types/website';
import { 
  fetchWebsitePages, 
  createWebsitePage as apiCreatePage, 
  updateWebsitePage as apiUpdatePage, 
  deleteWebsitePage as apiDeletePage,
  type ApiWebsitePage 
} from '@/lib/api';

export type { WebsitePage, PageStatus };

export type WebsiteTab = 'pages' | 'editor' | 'services' | 'seo';

// Service listing type (local only for now)
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

// Default pages (fallback when API fails)
const DEFAULT_PAGES: readonly WebsitePage[] = [];
const DEFAULT_SERVICES: readonly ServiceListing[] = [];

// Map API response to type
function mapApiPage(api: ApiWebsitePage): WebsitePage {
  return {
    id: api.id,
    title: api.title,
    slug: api.slug,
    status: api.status,
    content: api.content || '',
    lastModified: api.updated_at,
    author: api.author || '',
    template: api.template || 'default',
    seo: api.seo || {
      title: '',
      description: '',
      keywords: [],
      ogImage: '',
      canonicalUrl: '',
    },
    views: api.views || 0,
  };
}

export function useWebsiteData() {
  const [activeTab, setActiveTab] = useState<WebsiteTab>('pages');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PageStatus | 'all'>('all');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>('all');

  // Pages stored in state
  const [pages, setPages] = useState<readonly WebsitePage[]>(DEFAULT_PAGES);
  const [services] = useState<readonly ServiceListing[]>(DEFAULT_SERVICES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch pages from API
  const loadPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWebsitePages({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery || undefined,
      });
      setPages(response.items.map(mapApiPage));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pages');
      // Keep existing pages on error
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const filteredPages = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return pages.filter((page) => {
      const matchesSearch = !query
        || page.title.toLowerCase().includes(query)
        || page.slug.toLowerCase().includes(query)
        || page.author.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || page.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [pages, searchQuery, statusFilter]);

  const selectedPage = useMemo(
    () => pages.find((p) => p.id === selectedPageId) ?? null,
    [pages, selectedPageId],
  );

  const editingPage = useMemo(
    () => pages.find((p) => p.id === editingPageId) ?? null,
    [pages, editingPageId],
  );

  const filteredServices = useMemo(() => {
    const query = serviceSearch.toLowerCase();
    return services.filter((svc) => {
      const matchesSearch = !query
        || svc.name.toLowerCase().includes(query)
        || svc.category.toLowerCase().includes(query);
      const matchesCategory = serviceCategoryFilter === 'all' || svc.category === serviceCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [services, serviceSearch, serviceCategoryFilter]);

  const pageStats = useMemo(() => ({
    total: pages.length,
    published: pages.filter((p) => p.status === 'published').length,
    draft: pages.filter((p) => p.status === 'draft').length,
    scheduled: pages.filter((p) => p.status === 'scheduled').length,
  }), [pages]);

  const openEditor = useCallback((pageId: string) => {
    setEditingPageId(pageId);
    setActiveTab('editor');
  }, []);

  const openSEO = useCallback((pageId: string) => {
    setSelectedPageId(pageId);
    setActiveTab('seo');
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
  }, []);

  const clearServiceFilters = useCallback(() => {
    setServiceSearch('');
    setServiceCategoryFilter('all');
  }, []);

  // Page mutations (with API)
  const addPage = useCallback(async (page: Omit<WebsitePage, 'id'>) => {
    try {
      const apiPage = await apiCreatePage({
        title: page.title,
        slug: page.slug,
        status: page.status,
        content: page.content,
        template: page.template,
        author: page.author,
        seo: page.seo,
      });
      const newPage = mapApiPage(apiPage);
      setPages((prev) => [...prev, newPage]);
      return newPage;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create page');
      throw err;
    }
  }, []);

  const updatePage = useCallback(async (pageId: string, updates: Partial<WebsitePage>) => {
    try {
      const apiPage = await apiUpdatePage(pageId, {
        title: updates.title,
        slug: updates.slug,
        status: updates.status,
        content: updates.content,
        template: updates.template,
        author: updates.author,
        seo: updates.seo,
        views: updates.views,
      });
      const updated = mapApiPage(apiPage);
      setPages((prev) =>
        prev.map((p) => (p.id === pageId ? updated : p))
      );
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update page');
      throw err;
    }
  }, []);

  const deletePage = useCallback(async (pageId: string) => {
    try {
      await apiDeletePage(pageId);
      setPages((prev) => prev.filter((p) => p.id !== pageId));
      if (selectedPageId === pageId) setSelectedPageId(null);
      if (editingPageId === pageId) setEditingPageId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete page');
      throw err;
    }
  }, [selectedPageId, editingPageId]);

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    selectedPageId,
    setSelectedPageId,
    editingPageId,
    setEditingPageId,
    serviceSearch,
    setServiceSearch,
    serviceCategoryFilter,
    setServiceCategoryFilter,
    filteredPages,
    selectedPage,
    editingPage,
    filteredServices,
    pageStats,
    loading,
    error,
    openEditor,
    openSEO,
    clearFilters,
    clearServiceFilters,
    // Page mutations
    addPage,
    updatePage,
    deletePage,
    refresh: loadPages,
  } as const;
}
